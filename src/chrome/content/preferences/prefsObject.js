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

/**
 * Defines the Prefs global object, that can be used to retrieve the values
 *  of all the MAF user customizable options. The values are managed by
 *  the standard preferences system, and can be modified using the hosting
 *  application's interface or the extension's preferences dialog.
 *
 * When adding a preference here, also update "prefsDialog.xul" and
 *  "prefsDefaults.js" accordingly.
 */
var Prefs = {
  /*
   * Public properties to read preferences
   */

  /**
   * Returns true if MAF menu items should be shown in the File menu.
   */
  get interfaceMenuFile() {
    return this._prefBranchForMaf.getBoolPref("interface.menu.file");
  },

  /**
   * Returns true if MAF menu items should be shown in the Tools menu.
   */
  get interfaceMenuTools() {
    return this._prefBranchForMaf.getBoolPref("interface.menu.tools");
  },

  /**
   * Returns true if MAF menu items should be shown in the page context menu.
   */
  get interfaceMenuPageContext() {
    return this._prefBranchForMaf.getBoolPref("interface.menu.pagecontext");
  },

  /**
   * Returns true if MAF menu items should be shown in the tab bar context menu.
   *
   * If this preference is false, some of the tab bar context menu items may
   *  appear in the page context menu instead.
   */
  get interfaceMenuTabsContext() {
    return this._prefBranchForMaf.getBoolPref("interface.menu.tabscontext");
  },

  /**
   * Returns true if the additional "Save In Archive" menu item and its
   *  variations should be shown in the various menus. The "Save In Archive"
   *  menu item is always present in the Tools menu.
   */
  get interfaceMenuItemSaveInArchive() {
    return this._prefBranchForMaf.
     getBoolPref("interface.menuitem.saveinarchive");
  },

  /** Enumeration for saveComponent */
  SAVECOMPONENT_STANDARD: "standard",
  SAVECOMPONENT_SAVECOMPLETE: "savecomplete",

  /**
   * Returns the component MAF will use when saving pages from the web to a
   *  local folder, before archiving the saved elements.
   *
   * Possible values:
   *   SAVECOMPONENT_STANDARD     - (default) Use the browser's native "save
   *                                 complete web page" functionality.
   *   SAVECOMPONENT_SAVECOMPLETE - Use the integrated "Save Complete" code.
   *   (other)                    - If the user has customized the preference.
   */
  get saveComponent() {
    var prefValue = this._prefBranchForMaf.getCharPref("save.component");
    // The "maf" value represented the internal save component, that is not
    //  available anymore. If that value is specified in the preference, the
    //  Save Complete component is used instead.
    return (prefValue == "maf" ? this.SAVECOMPONENT_SAVECOMPLETE : prefValue);
  },

  /**
   * Returns true if extended metadata, like the browser's current text zoom
   *  and scroll position, must be saved in new archives.
   */
  get saveMetadataExtended() {
    return this._prefBranchForMaf.getBoolPref("save.metadata.extended");
  },

  /** Enumeration for openAction */
  OPENACTION_TABS: "tabs",
  OPENACTION_ASK: "ask",
  OPENACTION_REMEMBER: "remember",

  /**
   * Returns the action to be performed when an archive is opened.
   *
   * Possible values:
   *   OPENACTION_TABS     - (default) Open each contained page in a new tab.
   *   OPENACTION_ASK      - Show a dialog with the list of all open archives,
   *                          that can be used to select an action.
   *   OPENACTION_REMEMBER - Add the archive to the list of all open archives,
   *                          but don't show the dialog.
   *   (other)             - If the user has customized the preference.
   */
  get openAction() {
    return this._prefBranchForMaf.getCharPref("open.action");
  },

  /**
   * Returns true if MAF should rewrite absolute URLs in open documents if
   *  they refer to a page that was saved in any of the open archives.
   */
  get openRewriteUrls() {
    return this._prefBranchForMaf.getBoolPref("open.rewriteurls");
  },

  /**
   * Returns the absolute path of the temporary folder.
   */
  get tempFolder() {
    // Get the value as an Unicode string
    var tempFolderPath = this._prefBranchForMaf.getComplexValue(
     "temp.folder", Ci.nsISupportsString).data;
    // If the string is empty, use the default path, that is a subdirectory
    //  of the system temporary directory
    if (!tempFolderPath) {
      var tempDir = Cc["@mozilla.org/file/directory_service;1"]
       .getService(Ci.nsIProperties).get("TmpD", Ci.nsIFile);
      tempDir.append(this._DEFAULT_TEMPFOLDER_NAME);
      tempFolderPath = tempDir.path;
    }
    // Return the absolute file path
    return tempFolderPath;
  },

  /**
   * Returns true if the temporary folder must be cleaned up on exit.
   */
  get tempClearOnExit() {
    return this._prefBranchForMaf.getBoolPref("temp.clearonexit");
  },

  /*
   * Private methods and properties
   */

  _DEFAULT_TEMPFOLDER_NAME: "maftemp",

  _prefBranchForMaf: Cc["@mozilla.org/preferences-service;1"]
    .getService(Ci.nsIPrefService).getBranch("extensions.maf.")
}