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

Cu.import("resource://gre/modules/FileUtils.jsm");

/**
 * Defines the Prefs global object, that can be used to retrieve the values of
 * all the MAF user customizable options. The values are managed by the standard
 * preferences system, and can be modified using the hosting application's
 * interface or the extension's preferences dialog.
 *
 * When adding a preference here, also update "prefsDialog.xul" and
 * "prefsDefaults.js" accordingly.
 */
var Prefs = {
  /*
   * Public properties to read preferences
   */

  /**
   * True if MAFF files should be associated with the host application.
   */
  get associateMaff() {
    return this.prefBranch.getBoolPref("associate.maff");
  },
  set associateMaff(value) {
    this.prefBranch.setBoolPref("associate.maff", value);
  },

  /**
   * True if MHTML files should be associated with the host application.
   */
  get associateMhtml() {
    return this.prefBranch.getBoolPref("associate.mhtml");
  },
  set associateMhtml(value) {
    this.prefBranch.setBoolPref("associate.mhtml", value);
  },

  /**
   * Semicolon-separated list of possible suffixes for the folder containing
   * support data files associated with a complete page saved as HTML.
   */
  get convertDataFolderSuffixes() {
    return this.prefBranch.getCharPref("advanced.datafoldersuffixes");
  },

  /**
   * Array containing one element for each valid data folder suffix.
   */
  get convertDataFolderSuffixesArray() {
    // Remove spaces near separators and filter out empty elements.
    return this.convertDataFolderSuffixes.split(";").map(String.trim)
                                                    .filter(e => e);
  },

  /**
   * Returns true if a notification bar with page details should be displayed
   * when an archived page is displayed.
   */
  get interfaceInfoBar() {
    return this.prefBranch.getBoolPref("interface.info.bar");
  },

  /**
   * Returns true if an icon should be displayed in the location bar to access
   * page details when an archived page is displayed.
   */
  get interfaceInfoIcon() {
    return this.prefBranch.getBoolPref("interface.info.icon");
  },

  /**
   * Set to true if a beta version of the add-on has previously been installed.
   */
  get otherBeta() {
    return this.prefBranch.getBoolPref("other.beta");
  },
  set otherBeta(aValue) {
    this.prefBranch.setBoolPref("other.beta", aValue);
  },

  /**
   * Returns true if the page offering the update to the Beta Channel was never
   * displayed on startup.
   */
  get otherDisplayUpdateBetaPage() {
    return this.prefBranch.getBoolPref("other.displayupdatebetapage");
  },
  set otherDisplayUpdateBetaPage(aValue) {
    this.prefBranch.setBoolPref("other.displayupdatebetapage", aValue);
  },

  /**
   * Returns false only if a previous version of the extension was installed on
   * the same profile, indicating that the header of the welcome page should be
   * changed accordingly.
   */
  get otherDisplayWelcome() {
    return this.prefBranch.getBoolPref("other.displaywelcome");
  },
  set otherDisplayWelcome(aValue) {
    this.prefBranch.setBoolPref("other.displaywelcome", aValue);
  },

  /**
   * Returns true if the welcome dialog should be displayed on startup.
   */
  get otherDisplayWelcomePage() {
    return this.prefBranch.getBoolPref("other.displaywelcomepage");
  },
  set otherDisplayWelcomePage(aValue) {
    this.prefBranch.setBoolPref("other.displaywelcomepage", aValue);
  },

  /**
   * Returns true if the multi-process welcome dialog should be displayed.
   */
  get otherDisplayWelcomeMultiprocess() {
    return this.prefBranch.getBoolPref("other.displayE10Snotice");
  },
  set otherDisplayWelcomeMultiprocess(aValue) {
    this.prefBranch.setBoolPref("other.displayE10Snotice", aValue);
  },

  /**
   * Returns true if extended metadata, like the browser's current text zoom
   * and scroll position, must be saved in new archives.
   */
  get saveMetadataExtended() {
    return this.prefBranch.getBoolPref("advanced.maff.extendedmetadata");
  },

  /**
   * Returns true if the commands to save web archives should be available.
   */
  get saveEnabled() {
    return this.prefBranch.getCharPref("save.method") == "snapshot" &&
           !Services.appinfo.browserTabsRemoteAutostart;
  },

  /** Enumeration for saveMaffCompression */
  MAFFCOMPRESSION_DYNAMIC: "dynamic",
  MAFFCOMPRESSION_BEST:    "best",
  MAFFCOMPRESSION_NONE:    "none",

  /**
   * Returns the compression level to use when saving files in a MAFF archive.
   *
   * Possible values:
   *   MAFFCOMPRESSION_DYNAMIC
   *     (default) Use maximum compression for all files, but do not re-compress
   *     media files.
   *   MAFFCOMPRESSION_BEST
   *     Use maximum compression for all files.
   *   MAFFCOMPRESSION_NONE
   *     Store all the files uncompressed.
   *   (other)
   *     If the user has customized the preference.
   *
   * This preference is not displayed in the preferences dialog.
   */
  get saveMaffCompression() {
    return this.prefBranch.getCharPref("advanced.maff.compression");
  },

  /**
   * Returns true if the ".mhtml" file extension should be preferred over ".mht"
   * in the file filters for the "Save As" dialogs.
   */
  get saveUseMhtmlExtension() {
    return this.prefBranch.getBoolPref(
     "advanced.mhtml.usemhtmlextension");
  },

  /**
   * Returns true if the character set specified in MAFF files should be ignored
   * instead of being enforced when the page is displayed.
   */
  get openMaffIgnoreCharacterSet() {
    return this.prefBranch.getBoolPref(
     "advanced.maff.ignorecharacterset");
  },

  /**
   * Returns true if the contents of MAFF archives should be accessed directly
   * using the "jar:" protocol instead of extracting the archive to a
   * temporary folder and using the "file:" protocol.
   *
   * The "jar:" protocol may be faster but using it may lock the archive file.
   */
  get openUseJarProtocol() {
    return this.prefBranch.getBoolPref("advanced.maff.usejarprotocol");
  },

  /**
   * Returns the absolute path of the temporary folder.
   */
  get tempFolder() {
    // Get the value as an Unicode string.
    var tempFolderPath = this.prefBranch.getComplexValue(
     "advanced.temp.folder", Ci.nsISupportsString).data;
    // If the string is empty, use the default path, that is a subdirectory of
    // the system temporary directory.
    if (!tempFolderPath) {
      tempFolderPath = this._defaultTempFolderPath;
    }
    // Return the absolute file path.
    return tempFolderPath;
  },

  /**
   * Returns true if the temporary folder must be cleaned up on exit.
   */
  get tempClearOnExit() {
    return this.prefBranch.getBoolPref("advanced.temp.clearonexit");
  },

  /*
   * Other properties
   */

  /**
   * Returns a reference to the MAF preferences branch, that can be used to add
   * and remove preference observers. For more information, see
   * <https://developer.mozilla.org/en/Code_snippets/Preferences#Using_preference_observers>
   * (retrieved 2009-08-30).
   */
  prefBranch: Cc["@mozilla.org/preferences-service;1"].
   getService(Ci.nsIPrefService).getBranch("extensions.spcw.").
   QueryInterface(Ci.nsIPrefBranch2),

  /**
   * Returns the default temporary folder path, located in the system temporary
   * directory and different for each user profile.
   */
  get _defaultTempFolderPath() {
    // The Services.cpmm getter is not available in Firefox 38.
    let cpmm = Cc["@mozilla.org/childprocessmessagemanager;1"].
     getService(Ci.nsIMessageSender);

    // Do not recalculate the value the second time this property is read.
    delete this._defaultTempFolderPath;
    return (this._defaultTempFolderPath = cpmm.sendSyncMessage(
     "SavedPagesConversionWizard:ComputeDefaultTempFolderPath")[0]);
  },

  /**
   * Computes the default temporary folder path, located in the system temporary
   * directory and different for each user profile.
   */
  computeDefaultTempFolderPath: function() {
    // Since the temporary folder is cleared when the browser exits, we need to
    // return a path that is different for each concurrent user. We also want
    // the temporary path to be the same for every browsing session of the same
    // user, but located in the default temporary directory, thus different if
    // the same user profile is accessed from different computers. To ensure
    // this, we calculate a path based on the temporary folder, but that
    // includes the hash of the user profile path. This is required because on
    // some platforms the temporary folder is the same for all users.
    var profilePath = this._dirService.get("ProfD", Ci.nsIFile).path;
    var tempDir = this._dirService.get("TmpD", Ci.nsIFile);
    tempDir.append("maftemp-" + this._getHexHashMD5(profilePath).slice(0, 8));
    return tempDir.path;
  },

  /**
   * Returns a string with the MD5 hash of the specified Unicode string.
   */
  _getHexHashMD5: function(aString) {
    // Convert the characters to UTF-8 octets.
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
     createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var octets = converter.convertToByteArray(aString, {});
    // Calculate the hash of the octets.
    var cryptoHash = Cc["@mozilla.org/security/hash;1"].
     createInstance(Ci.nsICryptoHash);
    cryptoHash.init(Ci.nsICryptoHash.MD5);
    cryptoHash.update(octets, octets.length);
    var hashOctets = cryptoHash.finish(false);
    // Return the hash as a hexadecimal string.
    return [for (c of hashOctets)
     ("0" + c.charCodeAt(0).toString(16)).slice(-2)].join("");
  },

  _dirService: Cc["@mozilla.org/file/directory_service;1"]
   .getService(Ci.nsIProperties),
}
