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
 * This module contains the shared objects that store the metadata about the
 *  archives that have been opened or saved in this session.
 */

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;
var Cu = Components.utils;

// Define symbols available to users of this JavaScript Module
var EXPORTED_SYMBOLS = ["ArchiveCache"];

/**
 * This object stores all the archives that are known in this session.
 */
var ArchiveCache = {

  /**
   * Register the given archive object in the cache. After an archive object
   *  has been registered in the cache, it must not be modified without
   *  unregistering it first.
   *
   * @param aArchive   Object of type Archive whose metadata will be cached.
   */
  registerArchive: function(aArchive) {
    // Remove any previously registered archive object with the same key
    var oldArchive = this._archivesByKey[aArchive.cacheKey];
    if (oldArchive) {
      this.unregisterArchive(oldArchive);
    }
    // Register the archive in the cache
    this._archivesByKey[aArchive.cacheKey] = aArchive;
    // Add information about the individual pages
    for (var [, page] in Iterator(aArchive.pages)) {
      // The following URLs are normally unique for every extracted page
      this._pagesByArchiveUri[page.archiveUri.spec] = page;
      this._pagesByTempUri[page.tempUri.spec] = page;
      this._pagesByTempFolderUri[page.tempFolderUri.spec] = page;
      if (page.directArchiveUri) {
        this._pagesByDirectArchiveUri[page.directArchiveUri.spec] = page;
      }
      // The original URL the page was saved from may be the same for more than
      //  one archived page. Use an array to store all the possible pages.
      var essentialUriSpec = this._getEssentialUriSpec(page.originalUrl);
      var pageArray = this._getPageArrayFromOriginalUri(essentialUriSpec);
      pageArray.push(page);
    }
  },

  /**
   * Remove the given archive object from the cache.
   *
   * @param aArchive   Object of type Archive to be removed from the cache.
   */
  unregisterArchive: function(aArchive) {
    // Ensure that the archive is present in the cache
    if (!this._archivesByKey[aArchive.cacheKey]) {
      return;
    }
    // Remove the archive from the cache
    delete this._archivesByKey[aArchive.cacheKey];
    // Remove information about the individual pages
    for (var [, page] in Iterator(aArchive.pages)) {
      // The following URLs are normally unique for every extracted page
      delete this._pagesByArchiveUri[page.archiveUri.spec];
      delete this._pagesByTempUri[page.tempUri.spec];
      delete this._pagesByTempFolderUri[page.tempFolderUri.spec];
      if (page.directArchiveUri) {
        delete this._pagesByDirectArchiveUri[page.directArchiveUri.spec];
      }
      // The original URL the page was saved from may be the same for more than
      //  one archived page. Use an array to store all the possible pages.
      var essentialUriSpec = this._getEssentialUriSpec(page.originalUrl);
      var pageArray = this._getPageArrayFromOriginalUri(essentialUriSpec);
      pageArray.splice(pageArray.indexOf(page), 1);
    }
  },

  // --- Private methods and properties ---

  /**
   * Returns a string representing the basic normalized version of the specified
   *  URL string. If present, the hash is removed.
   */
  _getEssentialUriSpec: function(aSpec) {
    // Get the URL object associated with the specified string
    var url;
    try {
      url = Cc["@mozilla.org/network/io-service;1"].
       getService(Ci.nsIIOService).newURI(aSpec, null, null).
       QueryInterface(Ci.nsIURL);
    } catch (e if (e instanceof Ci.nsIException && (e.result ==
     Cr.NS_NOINTERFACE || e.result == Cr.NS_ERROR_MALFORMED_URI))) {
      // The original URL is invalid or not hierarchical
      return aSpec;
    }
    // Return the URL string without the unneeded data
    url.ref = "";
    return url.spec;
  },

  /**
   * Returns the array of pages associated with the given original URI.
   */
  _getPageArrayFromOriginalUri: function(aSpec) {
    // Create an empty array if the entry for the specified URI does not exist
    if (!this._pageArraysByOriginalUri[aSpec]) {
      this._pageArraysByOriginalUri[aSpec] = [];
    }
    // Return the array
    return this._pageArraysByOriginalUri[aSpec];
  },

  /**
   * Associative array containing all the registered Archive objects.
   */
  _archivesByKey: {},

  /**
   * Associative array containing all the available archived pages, accessible
   *  by their specific archive URI.
   */
  _pagesByArchiveUri: {},

  /**
   * Associative array containing all the available archived pages, accessible
   *  by the URI of their main file in the temporary directory.
   */
  _pagesByTempUri: {},

  /**
   * Associative array containing all the available archived pages, accessible
   *  by the URI of their specific temporary folder.
   */
  _pagesByTempFolderUri: {},

  /**
   * Associative array containing some of the available archived pages,
   *  accessible by their direct archive access URI (for example, a "jar:" URI).
   */
  _pagesByDirectArchiveUri: {},

  /**
   * Associative array containing, for every normalized original URI, an array
   *  of local pages that refer to that original resource.
   */
  _pageArraysByOriginalUri: {}
};