#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const androidRoot = join(root, "src-tauri", "gen", "android");

if (!existsSync(androidRoot)) {
  console.log(
    "[patch-android] src-tauri/gen/android not found, run `npm run android:init` first. Skipping."
  );
  process.exit(0);
}

const tauriConfPath = join(root, "src-tauri", "tauri.conf.json");
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf8"));
const identifier = tauriConf.identifier;
if (!identifier) {
  console.error("[patch-android] Could not read `identifier` from tauri.conf.json");
  process.exit(1);
}
const pkgPath = identifier.split(".").join("/");

const mainActivityDir = join(androidRoot, "app", "src", "main", "java", pkgPath);
const mainActivityPath = join(mainActivityDir, "MainActivity.kt");

const MARKER = "// patch-android: no-disk-cache v2";

const mainActivitySrc = `package ${identifier}

${MARKER}
// Generated/maintained by scripts/patch-android.mjs, do not hand-edit,
// edit that script instead so the fix survives \`tauri android init\`.

import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebStorage
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {

    private lateinit var wv: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
    }

    override fun onWebViewCreate(webView: WebView) {
        super.onWebViewCreate(webView)
        wv = webView

        val settings: WebSettings = webView.settings
        settings.cacheMode = WebSettings.LOAD_NO_CACHE
        settings.saveFormData = false
        settings.databaseEnabled = false
        settings.safeBrowsingEnabled = false

        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false)

        clearAllWebViewData(webView)
    }

    override fun onPause() {
        super.onPause()
        if (::wv.isInitialized) {
            clearAllWebViewData(wv)
        }
    }

    private fun clearAllWebViewData(webView: WebView) {
        webView.clearCache(true)
        webView.clearHistory()
        webView.clearFormData()
        WebStorage.getInstance().deleteAllData()
        CookieManager.getInstance().removeAllCookies(null)
        CookieManager.getInstance().flush()
    }
}
`;

if (!existsSync(mainActivityDir)) {
  console.error(
    `[patch-android] Expected directory not found: ${mainActivityDir}\n` +
      "Check that `identifier` in tauri.conf.json matches the generated Android package path."
  );
  process.exit(1);
}

const existingMainActivity = existsSync(mainActivityPath)
  ? readFileSync(mainActivityPath, "utf8")
  : "";

if (existingMainActivity.includes(MARKER)) {
  console.log("[patch-android] MainActivity.kt already patched, skipping.");
} else {
  writeFileSync(mainActivityPath, mainActivitySrc, "utf8");
  console.log(`[patch-android] Wrote ${mainActivityPath}`);
}

const manifestPath = join(androidRoot, "app", "src", "main", "AndroidManifest.xml");
let manifest = readFileSync(manifestPath, "utf8");
let manifestChanged = false;

function setAppAttr(xml, attr, value) {
  const appTagMatch = xml.match(/<application\b[^>]*>/);
  if (!appTagMatch) {
    throw new Error("Could not find <application> tag in AndroidManifest.xml");
  }
  const tag = appTagMatch[0];
  const attrRegex = new RegExp(`android:${attr}="[^"]*"`);
  let newTag;
  if (attrRegex.test(tag)) {
    newTag = tag.replace(attrRegex, `android:${attr}="${value}"`);
  } else {
    newTag = tag.replace(/<application\b/, `<application android:${attr}="${value}"`);
  }
  if (newTag !== tag) {
    manifestChanged = true;
    return xml.replace(tag, newTag);
  }
  return xml;
}

manifest = setAppAttr(manifest, "allowBackup", "false");
manifest = setAppAttr(manifest, "fullBackupContent", "false");
manifest = setAppAttr(manifest, "dataExtractionRules", "@xml/data_extraction_rules");

if (manifestChanged) {
  writeFileSync(manifestPath, manifest, "utf8");
  console.log(`[patch-android] Updated ${manifestPath}`);
} else {
  console.log("[patch-android] AndroidManifest.xml already patched, skipping.");
}

const xmlResDir = join(androidRoot, "app", "src", "main", "res", "xml");
const rulesPath = join(xmlResDir, "data_extraction_rules.xml");
const rulesContent = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup disableIfNoEncryptionCapability="true" />
</data-extraction-rules>
`;

if (!existsSync(xmlResDir)) mkdirSync(xmlResDir, { recursive: true });
const existingRules = existsSync(rulesPath) ? readFileSync(rulesPath, "utf8") : "";
if (existingRules !== rulesContent) {
  writeFileSync(rulesPath, rulesContent, "utf8");
  console.log(`[patch-android] Wrote ${rulesPath}`);
} else {
  console.log("[patch-android] data_extraction_rules.xml already patched, skipping.");
}

console.log("[patch-android] Done.");