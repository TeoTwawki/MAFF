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
 * Portions created by the Initial Developer are Copyright (C) 2009
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
 * Represents a web resource that is part of a web page.
 */
function PersistResource() {

}

PersistResource.prototype = {

  // --- Public methods and properties ---

  /**
   * nsIFile object containing the local copy of the web resource.
   */
  file: null,

  /**
   * nsIURI object representing the original location of the web resource.
   */
  originalUri: null,

  /**
   * URL-encoded string representing the original location of the web resource,
   *  or the relative position of the resource with regard to a known root.
   */
  contentLocation: "",

  /**
   * String representing the MIME type of the web resource.
   */
  mimeType: "",

  /**
   * Initializes the relevant metadata about the current resource starting from
   *  the given local file.
   *
   * @param aFile   nsIFile to be associated with the resource.
   */
  initFromFile: function(aFile) {
    // Initialize the known member variables
    this.file = aFile;
    // Get the MIME type from the local file if possible
    var fileUri = Cc["@mozilla.org/network/io-service;1"].
     getService(Ci.nsIIOService).newFileURI(aFile);
    try {
      this.mimeType = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService).
       getTypeFromURI(fileUri);
    } catch (e) {
      // In case the MIME type cannot be determined, use a binary file type
      this.mimeType = "application/octet-stream";
    }
  }
}