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
 * This object handles all the tasks related to extension initialization and
 *  termination.
 */
var StartupInitializer = {

  /**
   * This function is called every time a new user profile is ready for use in
   *  the host application, usually before the first window is opened.
   *
   * Dynamic MIME type and document loader factory registrations must be done
   *  here, instead of when the first browser windows loads, to handle the case
   *  where the path of an archive managed by MAF is specified on the
   *  command-line.
   *
   * This function is hard-coded to enable handling of the MAFF file format
   *  (.maff file extension) and MHTML file format (.mht and .mhtml file
   *  extensions). Since MAF works with local files only, the file extension
   *  is prioritized over the expected MIME type of the content.
   *
   * All the initializations done here are temporary (not persisted) and survive
   *  until the application is closed. No explicit cleanup is done when a user
   *  profile is unloaded.
   */
  initFromCurrentProfile: function() {
    // Register our Document Loader Factory for every handled file type. MAF is
    //  the extension that will preferably handle the MAFF file format, while it
    //  will handle MHTML only if no other extension does it.
    new DlfRegisterer("@amadzone.org/maf/document-loader-factory;1")
     .addFileExtension("mhtml", "application/x-mht",  false)
     .addFileExtension("mht",   "application/x-mht",  false)
     .addFileExtension("maff",  "application/x-maff", true)
     .register();
  },

  /**
   * This function is called when the application is shutting down.
   *
   * The temporary folder is cleaned up at this point, if requested. The folder
   *  itself is not removed, since it may be a user-chosen folder with custom
   *  permissions, that would be lost.
   */
  terminate: function() {
    if (Prefs.tempClearOnExit) {
      // Find the temporary directory
      var dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
      dir.initWithPath(Prefs.tempFolder);
      // The directory may not exist if no archive has been extracted or saved
      if (dir.exists()) {
        // Enumerate all the files and subdirectories in the specified directory
        var dirEntries = dir.directoryEntries;
        while (dirEntries.hasMoreElements()) {
          try {
            // Get the local file or directory object and delete it recursively
            var dirEntry = dirEntries.getNext().QueryInterface(Ci.nsILocalFile);
            dirEntry.remove(true);
          } catch (e) {
            // Ignore errors and go on with the next file or subdirectory
            Cu.reportError(e);
          }
        }
      }
    }
  }
}