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
 * The ArchiveLoader global object provides helper functions for opening web
 *  archives in browser windows.
 */
var ArchiveLoader = {

  // --- Public methods and properties ---

  /**
   * Opens the specified archive or archive page synchronously, and returns an
   *  nsIURI object pointing to the actual content to be displayed. This
   *  function also performs all the operations related to opening multi-page
   *  archives, working on the provided container.
   *
   * @param aArchiveUri   nsIURI pointing to the archive to be opened.
   * @param aContainer    Reference to the browser DocShell where the archive
   *                       will be opened. For general information on DocShell,
   *                       see <https://developer.mozilla.org/en/DocShell>
   *                       (retrieved 2009-05-31).
   */
  load: function(aArchiveUri, aContainer) {
    // Find the requested page in the archive cache
    var page = ArchiveCache.pageFromUriSpec(aArchiveUri.spec);

    // If the specified page has not been loaded yet
    if (!page) {
      // Currently we can only open MAF archives from "file://" URLs.
      var archiveFile = aArchiveUri.QueryInterface(Ci.nsIFileURL).file;

      // Extract the archive and register it in the archive cache
      var archive = ArchiveLoader.extractAndRegister(archiveFile);

      // Find the exact requested page from the archive cache
      page = ArchiveCache.pageFromUriSpec(aArchiveUri.spec);

      // If the page is not found, probably the provided URL refers to a
      //  multi-page archive, but not to a specific page inside it. In this
      //  case, display a temporary page while waiting for the archive to be
      //  opened in multiple tabs. The first page in the archive will be opened
      //  in the same window where this load was attempted.
      if (!page) {
        return ArchiveLoader._openMultipageArchive(archive, archive.pages[0],
         aContainer);
      }
    }

    // Display the content associated with the page. Depending on the current
    //  preferences, the content is loaded from the temporary directory or
    //  directly from the archive, if possible.
    if (page.directArchiveUri && Prefs.openUseJarProtocol) {
      return page.directArchiveUri;
    } else {
      return page.tempUri;
    }
  },

  /**
   * Extracts the specified archive and registers it in the archive cache.
   *  Returns the new Archive object associated with the specified archive.
   *
   * @param aArchiveFile   nsIFile pointing to the archive to be extracted.
   */
  extractAndRegister: function(aArchiveFile) {
    // Determine the name of the directory where the archive will be extracted
    var dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    dir.initWithPath(Prefs.tempFolder);
    dir.append(new Date().valueOf() + "_" + Math.floor(Math.random() * 1000));

    // Determine the format to use from the file name and extract the archive
    var archive;
    if (FileFilters.scriptPathFromFilePath(aArchiveFile.path) == "TypeMHTML") {
      archive = new MhtmlArchive(aArchiveFile);
    } else {
      archive = new MaffArchive(aArchiveFile);
    }
    archive._tempDir = dir;
    archive.extractAll();

    // Register the archive in the cache
    ArchiveCache.registerArchive(archive);

    // Return the new Archive object
    return archive;
  },

  /**
   * Opens the pages in the specified archive in tabs, except for the specified
   *  main page, that is queued as a refresh on the specified DocShell.
   */
  _openMultipageArchive: function(aArchive, aMainPage, aContainer) {
    // Find the browser window associated with the document being loaded
    var browserWindow = aContainer.
     QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).
     QueryInterface(Ci.nsIDocShellTreeItem).rootTreeItem.
     QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);

    // Open all the pages, except the main one, in other tabs
    var browser = browserWindow.getBrowser();
    for ([, page] in Iterator(aArchive.pages)) {
      if (page !== aMainPage) {
        browser.addTab(page.archiveUri.spec);
      }
    }

    // Redirect the document being loaded to the exact URI of the main page.
    //  The new URI takes the place of the original one in the browser
    //  history, and will be reloaded from the beginning. This operation
    //  prevents subsequent refreshes from opening the other archived pages
    //  again in new tabs. This method also works inside frames.
    aContainer.QueryInterface(Ci.nsIRefreshURI).refreshURI(
     aMainPage.archiveUri, 0, false, true);

    // Display an empty page while waiting for the redirect
    return Cc['@mozilla.org/network/io-service;1'].
     getService(Ci.nsIIOService).newURI("about:blank", null, null);
  }
}