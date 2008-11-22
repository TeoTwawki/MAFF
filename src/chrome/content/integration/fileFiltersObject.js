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
 * The FileFilters global object provides access to the information to be
 *  displayed in the "Open" and "Save As" dialogs, as well as providing means to
 *  match the file extensions to the internal type of an archive file.
 */
var FileFilters = {
  /*
   * Public methods and properties
   */

  /**
   * Returns a structured array with information on the file filters to use in
   *  the various "Open" dialogs. This property returns this array format:
   *   [i] = (Array) A file format definition
   *   [i][0] = (String) File format display name
   *   [i][1] = (String) List of file patterns associated with the file format
   *   [i][2] = (Integer) Default extension index, always 0
   */
  get openFiltersArray() {
    return [
     [this._str("opendialog.filters.webarchives"), "*.maff;*.mhtml;*.mht", 0]
     ];
  },

  /**
   * Returns a structured array with information on the file filters to use in
   *  the various "Save As" dialogs. This property returns the same array format
   *  as openFiltersArray, but each possible file extension is returned as a
   *  separate filter.
   */
  get saveFiltersArray() {
    return [
     [this._str("savedialog.filters.maff"), "*.maff", 0],
     [this._str("savedialog.filters.mhtml"), "*.mhtml", 0],
     [this._str("savedialog.filters.mht"), "*.mht", 0]
     ];
  },

  /**
   * Returns the "scriptPath" information for the item whose index in
   *  saveFiltersArray is specified.
   */
  scriptPathFromSaveIndex: function(aSaveFilterIndex) {
    return [
     "TypeMAFF",
     "TypeMHTML",
     "TypeMHTML"
     ][aSaveFilterIndex];
  },

  /**
   * Returns the "scriptPath" information for the archive whose local file
   *  path or file URI is specified.
   */
  scriptPathFromFilePath: function(aArchivePathOrURI) {
    // Assume MAFF unless filename ends with .MHTML or .MHT (case insensitive)
    var hasMhtmlExtension = /\.(mhtml|mht)$/i.test(aArchivePathOrURI);
    return (hasMhtmlExtension ? "TypeMHTML" : "TypeMAFF");
  },

  /*
   * Private methods and properties
   */

  /**
   * Returns the string whose key is specified from the object's string bundle.
   */
  _str: function(aKey) {
    return this._fileFiltersStrBundle.GetStringFromName(aKey);
  },

  _fileFiltersStrBundle: Cc["@mozilla.org/intl/stringbundle;1"]
    .getService(Ci.nsIStringBundleService).createBundle(
    "chrome://maf/locale/integration/fileFiltersObject.properties")
}