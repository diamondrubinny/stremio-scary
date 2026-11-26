// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import javax.inject.Inject
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
}

// The web app, built before this project (in ../web: pnpm build, after ../feed: npm run build). It is packed into the
// APK as it is and shown in a WebView, so the Android app and the web site are the same app.
abstract class SyncWebApp : DefaultTask() {
    @get:InputDirectory
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val webBuild: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @get:Inject
    abstract val files: FileSystemOperations

    @TaskAction
    fun sync() {
        require(webBuild.file("index.html").get().asFile.exists()) {
            "The web app is not built. Run `npm run build` in feed/ and `pnpm build` in web/ first."
        }
        files.sync {
            from(webBuild) {
                // Source maps are for debugging in a browser. The service worker caches a web site; here the files
                // are in the APK already.
                exclude("**/*.map", "service-worker.js", "workbox-*.js")
            }
            into(outputDir)
        }
    }
}

val syncWebApp = tasks.register<SyncWebApp>("syncWebApp") {
    description = "Copies the built web app (../web/build) into the APK's assets."
    webBuild.set(rootProject.layout.projectDirectory.dir("../web/build"))
}

android {
    namespace = "io.github.diamondrubinny.scary.web"
    compileSdk = 37

    defaultConfig {
        applicationId = "io.github.diamondrubinny.scary.web"
        // Android 8.0+, like SCARY for Android TV. The WebView itself must be a recent one (it updates through the store).
        minSdk = 26
        targetSdk = 37
        // CI run number, so every build installs over the previous one.
        versionCode = providers.environmentVariable("GITHUB_RUN_NUMBER").orNull?.toIntOrNull() ?: 1
        versionName = "0.1.0"
    }

    // A dedicated release key, when one is provided (CI secret or local environment). Without it the release build
    // is signed with the debug key. Never committed to the repository.
    val releaseKeystore = providers.environmentVariable("SCARY_KEYSTORE_FILE").orNull?.takeIf { file(it).exists() }
    signingConfigs {
        if (releaseKeystore != null) {
            create("release") {
                storeFile = file(releaseKeystore)
                storePassword = providers.environmentVariable("SCARY_KEYSTORE_PASSWORD").orNull
                keyAlias = providers.environmentVariable("SCARY_KEY_ALIAS").orNull
                keyPassword = providers.environmentVariable("SCARY_KEY_PASSWORD").orNull
            }
        }
    }

    buildTypes {
        debug {
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = false
    }

    lint {
        abortOnError = true
        warningsAsErrors = false
        checkDependencies = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

// The web app becomes the assets of every variant.
androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(syncWebApp, SyncWebApp::outputDir)
    }
}

dependencies {
    implementation(libs.androidx.activity)
    // WebViewAssetLoader (the app's files under a secure address) and WebMessageListener (one origin only).
    implementation(libs.androidx.webkit)
}
