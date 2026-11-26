// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

package io.github.diamondrubinny.scary.web

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.ServiceWorkerClientCompat
import androidx.webkit.ServiceWorkerControllerCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONException
import org.json.JSONObject
import kotlin.concurrent.thread

/**
 * SCARY Web as an Android app: the web app itself, packed into the APK and shown in a WebView. Phones, tablets and
 * Android TV get the same app the browser gets, with the same local library and the same privacy: there is no
 * account, and nothing here adds a request the web app does not make.
 *
 * The web app's files are served to the WebView under [APP_ORIGIN], a secure address that exists only inside this
 * app, so the page has the storage and the cryptography a secure page has (the parental PIN needs both). The WebView
 * shows that address and nothing else: any other link opens in the device's browser.
 */
class MainActivity : ComponentActivity() {
    private lateinit var root: FrameLayout
    private lateinit var webView: WebView

    /** The page's `<input type="file">` waiting for a file (restoring a backup). */
    private var fileChooser: ValueCallback<Array<Uri>>? = null

    /** The text the page asked to save, until the viewer has said where. */
    private var pendingSave: String? = null

    private var fullscreenView: View? = null
    private var fullscreenCallback: WebChromeClient.CustomViewCallback? = null

    private val openFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        fileChooser?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        fileChooser = null
    }

    private val createFile = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val text = pendingSave
        pendingSave = null
        if (uri != null && text != null) save(text, uri)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WebView.setWebContentsDebuggingEnabled(applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0)

        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain(APP_HOST)
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            isFocusable = true
            isFocusableInTouchMode = true
            settings.apply {
                // The web app is JavaScript; it is the app's own code, from the APK.
                javaScriptEnabled = true
                domStorageEnabled = true
                // The page reaches nothing on the device's storage: its files come through the asset loader only.
                allowFileAccess = false
                allowContentAccess = false
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                setSupportMultipleWindows(false)
                // A film starts when the viewer chooses it; the next episode may follow by itself.
                mediaPlaybackRequiresUserGesture = false
            }
            webViewClient = AppWebViewClient(assetLoader)
            webChromeClient = AppChromeClient()
        }

        // A service worker's own requests do not pass through the WebViewClient: they are answered from the APK too.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)) {
            ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(object : ServiceWorkerClientCompat() {
                override fun shouldInterceptRequest(request: WebResourceRequest): WebResourceResponse? =
                    assetLoader.shouldInterceptRequest(request.url)
            })
        }

        // The one thing the page may ask the app for: to save a file the viewer made (the backup). Only the app's own
        // pages can send it; a frame from anywhere else (a trailer's player) cannot.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(webView, BRIDGE_NAME, setOf(APP_ORIGIN)) { _, message, _, isMainFrame, _ ->
                if (isMainFrame) onPageMessage(message.data)
            }
        }

        root = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            addView(webView, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        }
        setContentView(root)

        // The app draws edge to edge; the web app is kept clear of the system bars, a cut-out and the keyboard.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime(),
            )
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }

        onBackPressedDispatcher.addCallback(this) {
            when {
                fullscreenView != null -> exitFullscreen()
                webView.canGoBack() -> webView.goBack()
                else -> finish()
            }
        }

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(START_URL)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        fileChooser?.onReceiveValue(null)
        fileChooser = null
        root.removeAllViews()
        webView.destroy()
        super.onDestroy()
    }

    /** A message from the page: `{"type":"saveFile","name":"…json","text":"…"}`. Anything else is ignored. */
    private fun onPageMessage(data: String?) {
        if (data == null || data.length > MAX_MESSAGE_CHARS) return
        val message = try {
            JSONObject(data)
        } catch (_: JSONException) {
            return
        }
        if (message.optString("type") != "saveFile") return
        val name = message.optString("name")
        val text = message.optString("text")
        if (!FILE_NAME.matches(name) || text.isEmpty()) return
        pendingSave = text
        // The viewer chooses where the file goes; the app writes nowhere else.
        createFile.launch(name)
    }

    private fun save(text: String, uri: Uri) {
        thread {
            val saved = runCatching {
                contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray(Charsets.UTF_8)) } ?: error("no stream")
            }.isSuccess
            runOnUiThread {
                Toast.makeText(this, if (saved) R.string.backup_saved else R.string.backup_failed, Toast.LENGTH_LONG).show()
            }
        }
    }

    /** Opens a link that is not the app's own in the device's browser. Only web addresses are passed on. */
    private fun openOutside(url: Uri) {
        if (url.scheme != "https" && url.scheme != "http") return
        try {
            startActivity(Intent(Intent.ACTION_VIEW, url).addCategory(Intent.CATEGORY_BROWSABLE))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.no_browser, Toast.LENGTH_LONG).show()
        }
    }

    private fun exitFullscreen() {
        val view = fullscreenView ?: return
        root.removeView(view)
        fullscreenView = null
        fullscreenCallback?.onCustomViewHidden()
        fullscreenCallback = null
        webView.visibility = View.VISIBLE
        webView.requestFocus()
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WindowInsetsControllerCompat(window, root).show(WindowInsetsCompat.Type.systemBars())
    }

    private inner class AppWebViewClient(private val assetLoader: WebViewAssetLoader) : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
            assetLoader.shouldInterceptRequest(request.url)

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url
            if (url.scheme == "https" && url.host == APP_HOST) return false
            // A frame inside the page (a trailer's player) goes where it goes. The page itself never leaves the app.
            if (!request.isForMainFrame) return false
            openOutside(url)
            return true
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
            // Should the page ever be anywhere but the app's own address, it is brought back.
            if (url != null && Uri.parse(url).host != APP_HOST) {
                view.stopLoading()
                view.loadUrl(START_URL)
            }
        }

        override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
            // The WebView's process ended (killed for memory, or crashed): start again rather than take the app down.
            recreate()
            return true
        }
    }

    private inner class AppChromeClient : WebChromeClient() {
        override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
            fileChooser?.onReceiveValue(null)
            fileChooser = callback
            return try {
                openFile.launch(arrayOf("application/json", "application/octet-stream", "text/plain"))
                true
            } catch (_: ActivityNotFoundException) {
                fileChooser = null
                false
            }
        }

        override fun onShowCustomView(view: View, callback: CustomViewCallback) {
            if (fullscreenView != null) {
                callback.onCustomViewHidden()
                return
            }
            fullscreenView = view
            fullscreenCallback = callback
            root.addView(view, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            webView.visibility = View.GONE
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            WindowInsetsControllerCompat(window, root).apply {
                systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                hide(WindowInsetsCompat.Type.systemBars())
            }
        }

        override fun onHideCustomView() = exitFullscreen()

        // No grey "play" picture while a video has nothing to show yet.
        override fun getDefaultVideoPoster(): Bitmap = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
    }

    private companion object {
        /** The address the web app's files have inside the WebView. It is not on the internet. */
        const val APP_HOST = "appassets.androidplatform.net"
        const val APP_ORIGIN = "https://$APP_HOST"
        const val START_URL = "$APP_ORIGIN/index.html"

        /** The name the page finds the app under: `window.ScaryAndroid.postMessage(…)`. */
        const val BRIDGE_NAME = "ScaryAndroid"
        const val MAX_MESSAGE_CHARS = 40_000_000
        val FILE_NAME = Regex("^[A-Za-z0-9._-]{1,80}\\.json$")
    }
}
