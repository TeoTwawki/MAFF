/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Archive Format.
 *
 * The Initial Developer of the Original Code is
 * Paolo Amadini <http://www.amadzone.org/>.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

XPCOMUtils.defineLazyModuleGetter(this, "UpdateUtils",
                                  "resource://gre/modules/UpdateUtils.jsm");

/**
 * This object handles extension startup and shutdown, and acts as bookkeeper
 * for the related observer registrations. Actual work is delegated to the
 * StartupInitializer object.
 */
var StartupEvents = {
  _notificationTopics: [
    "sessionstore-windows-restored",
    "quit-application",
    "xpcom-shutdown",
  ],

  // nsIObserver
  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "sessionstore-windows-restored": this.onWindowsRestored();  break;
      case "quit-application":              this.onAppQuit();          break;
      case "xpcom-shutdown":                this.onAppShutdown();      break;
    }
  },

  /**
   * Called when a user profile has fully loaded.
   */
  afterProfileChange: function() {
    for (let topic of this._notificationTopics) {
      Services.obs.addObserver(this, topic, false);
    }

    // Start the asynchronous operation that prepares the version information
    // that will be used when saving web archives.
    this._setAddonVersion();

    StartupInitializer.initFromCurrentProfile();
  },

  /**
   * This promise is resolved with the add-on version when it is known.
   */
  _promiseAddonVersion: null,

  /**
   * Populates the StartupInitializer.addonVersion property with the version of
   * the installed extension asynchronously.
   */
  _setAddonVersion: function() {
    // Get the object with the version information of Mozilla Archive Format.
    var addonId = "{7f57cf46-4467-4c2d-adfa-0cba7c507e54}";
    let { AddonManager } =
     Cu.import("resource://gre/modules/AddonManager.jsm", {});
    this._promiseAddonVersion = new Promise(resolve => {
      AddonManager.getAddonByID(addonId, function (aAddon) {
        StartupInitializer.addonVersion = aAddon.version;
        resolve(aAddon.version);
      });
    });
  },

  /**
   * Called when it is time to unregister all the observers.
   */
  onAppShutdown: function() {
    for (let topic of this._notificationTopics) {
      Services.obs.removeObserver(this, topic);
    }
  },

  /**
   * Called after all the browser windows have been shown.
   */
  onWindowsRestored: function() {
    this.shouldUpdateToBeta().then(shouldUpdateToBeta => {
      let browserWindow = Services.wm.getMostRecentWindow("navigator:browser");
      if (!browserWindow) {
        // Very rarely, it might happen that at this time all browser windows
        // have already been closed. In this case, we will attempt to show the
        // welcome page again on the next startup.
        return;
      }
      let browser = browserWindow.getBrowser();
      if (shouldUpdateToBeta && Prefs.otherDisplayUpdateBetaPage) {
        // Display the request to update to the Beta Channel as an alternative
        // welcome page. The normal welcome page with file associations will be
        // displayed on the next startup if was not shown before.
        browser.loadTabs(
         ["chrome://maf/content/preferences/updateBetaPage.xhtml"],
         false, false);
        Prefs.otherDisplayUpdateBetaPage = false;
      } else if (Prefs.otherDisplayWelcomePage) {
        // Load the page in foreground.
        browser.loadTabs(["chrome://maf/content/preferences/welcomePage.xhtml"],
                         false, false);
        Prefs.otherDisplayWelcomePage = false;
      }
      if (Services.appinfo.browserTabsRemoteAutostart &&
       Prefs.otherDisplayWelcomeMultiprocess) {
        browserWindow.openDialog(
         "chrome://maf/content/preferences/prefsDialog.xul", "",
         "chrome,titlebar,toolbar,centerscreen,modal");
        Prefs.otherDisplayWelcomeMultiprocess = false;
      }
    }).catch(Cu.reportError);
  },

  /**
   * Called when the application is shutting down.
   */
  onAppQuit: function() {
    StartupInitializer.terminate();
  },

  /**
   * Returns a promise that resolves to true if the add-on is installed from the
   * Release channel on a pre-release version of the browser.
   */
  shouldUpdateToBeta: function() {
    return this._promiseAddonVersion.then(version => {
      try {
        let isReleaseBrowser = /^(release|esr)($|\-)/.test(
         UpdateUtils.UpdateChannel);
        let isBetaAddon = /a|b|rc/.test(version);
        if (isBetaAddon) {
          Prefs.otherBeta = true;
        }
        return !isReleaseBrowser && !isBetaAddon;
      } catch (e) {
        // UpdateUtils.jsm is not available on Firefox 38 ESR, so in case of
        // exception we assume the browser is a release version.
        return false;
      }
    });
  },
};
