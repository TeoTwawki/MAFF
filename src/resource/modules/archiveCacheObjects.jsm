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
var EXPORTED_SYMBOLS = ["ArchiveCache", "ArchiveAnnotations"];

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
      // Add places annotations for the cached page
      ArchiveAnnotations.setAnnotationsForPage(page);
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
      // Clear the obsolete places annotations for the page
      ArchiveAnnotations.removeAnnotationsForPage(page);
    }
  },

  /**
   * Returns the page object associated with the file referenced by the given
   *  URL, if the URL represents a file in the temporary directory that is
   *  related to an available extracted page.
   *
   * @param aSpec   String representing the URI to check.
   */
  pageFromAnyTempUriSpec: function(aSpec) {
    // As an optimization, if this is the main page in an archive, return now
    if (this._pagesByTempUri[aSpec]) {
      return this._pagesByTempUri[aSpec];
    }
    // Build a local file URL object from the provided string
    var fileUrl;
    try {
      fileUrl = Cc["@mozilla.org/network/io-service;1"].
       getService(Ci.nsIIOService).newURI(aSpec, null, null).
       QueryInterface(Ci.nsIFileURL);
    } catch (e if (e instanceof Ci.nsIException && (e.result ==
     Cr.NS_NOINTERFACE || e.result == Cr.NS_ERROR_MALFORMED_URI))) {
      // The provided URL is invalid or is not a file URL. It cannot refer to
      //  a file in the temporary directory related to an extracted page.
      return null;
    }
    // Check if this file is located under any archive's temporary folder
    for (var [, page] in Iterator(this._pagesByTempUri)) {
      var folderUri = page.tempFolderUri.QueryInterface(Ci.nsIFileURL);
      // The following function checks whether fileUrl is located under the
      //  folder represented by folderUri
      if (folderUri.getCommonBaseSpec(fileUrl) === folderUri.spec) {
        return page;
      }
    }
    // The URL is unrelated to any extracted page
    return null;
  },

  /**
   * Returns the page object associated with the given URL.
   *
   * @param aSpec   String representing one of the URLs of the main file
   *                 associated with the page. It can be the archive URL,
   *                 the URL in the temporary folder, or the direct archive
   *                 access URL (for example, a "jar" URL).
   */
  pageFromUriSpec: function(aSpec) {
    // As an optimization, if this is the main page in an archive, return now
    return this._pagesByArchiveUri[aSpec] ||
           this._pagesByDirectArchiveUri[aSpec] ||
           this._pagesByTempUri[aSpec];
  },

  /**
   * Returns one of the page objects associated with the given original URL.
   *
   * @param aSpec   String representing the URI to check.
   */
  pageFromOriginalUriSpec: function(aSpec) {
    // Ignore the hash and other unneeded data when comparing
    var essentialReferenceSpec = this._getEssentialUriSpec(aSpec);
    // Retrieve the first page in the list, if available
    var pageArray = this._pageArraysByOriginalUri[essentialReferenceSpec];
    return pageArray && pageArray[0];
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

/**
 * This object handles annotations on archive pages for this session.
 *
 * Annotations are used to query and display information about the known
 *  archives using the Places interfaces. For more information, see
 *  <https://developer.mozilla.org/en/Using_the_Places_annotation_service>
 *  (retrieved 2009-05-23).
 */
var ArchiveAnnotations = {

  /** MAF annotation names */
  MAFANNO_TITLE: "maf/title",
  MAFANNO_ORIGINALURL: "maf/originalurl",
  MAFANNO_DATEARCHIVED: "maf/datearchived",
  MAFANNO_ARCHIVENAME: "maf/archivename",
  MAFANNO_TEMPURI: "maf/tempuri",
  MAFANNO_DIRECTARCHIVEURI: "maf/directarchiveuri",

  /**
   * Sets all the annotations associated with the given ArchivePage object.
   */
  setAnnotationsForPage: function(aPage) {
    // For all the possible annotations
    [
     [ArchiveAnnotations.MAFANNO_TITLE, aPage.title],
     [ArchiveAnnotations.MAFANNO_ORIGINALURL, aPage.originalUrl],
     [ArchiveAnnotations.MAFANNO_DATEARCHIVED, aPage.dateArchived],
     [ArchiveAnnotations.MAFANNO_ARCHIVENAME, aPage.archive.name],
     [ArchiveAnnotations.MAFANNO_TEMPURI, aPage.tempUri.spec],
     [ArchiveAnnotations.MAFANNO_DIRECTARCHIVEURI,
      (aPage.directArchiveUri ? aPage.directArchiveUri.spec : "")],
    ].forEach(function([annotationName, annotationValue]) {
      // Set the annotation while handling the data types correctly
      ArchiveAnnotations._setAnnotationForPage(aPage, annotationName,
       annotationValue);
    });
  },

  /**
   * Removes all the annotations associated with the given ArchivePage object.
   */
  removeAnnotationsForPage: function(aPage) {
    // For all the possible annotations
    [
     ArchiveAnnotations.MAFANNO_TITLE,
     ArchiveAnnotations.MAFANNO_ORIGINALURL,
     ArchiveAnnotations.MAFANNO_DATEARCHIVED,
     ArchiveAnnotations.MAFANNO_ARCHIVENAME,
     ArchiveAnnotations.MAFANNO_TEMPURI,
     ArchiveAnnotations.MAFANNO_DIRECTARCHIVEURI
    ].forEach(function(annotationName) {
      // Clear the annotation if present on the page's specific archive URI
      ArchiveAnnotations._annotationService.removePageAnnotation(
       aPage.archiveUri, annotationName);
    });
  },

  /**
   * Returns the value of an annotation for the given ArchivePage object.
   *
   * This function returns a Date object for annotations that represent dates.
   */
  getAnnotationForPage: function(aPage, aAnnotationName) {
    // Get the raw annotation value from the page's specific archive URI
    var annotationValue = ArchiveAnnotations._annotationService.
     getPageAnnotation(aPage.archiveUri, aAnnotationName);
    // If this is a date property, convert the numeric value to a Date object.
    //  If the annotation has the special value 0, the date is unspecified.
    if (ArchiveAnnotations.annotationIsDate(aAnnotationName)) {
      // In order for the sorting to work correctly, the annotation was stored
      //  as a string, and not a numeric value
      annotationValue = parseFloat(annotationValue);
      annotationValue = annotationValue ? new Date(annotationValue) : null;
    }
    // Return the string, numeric or date value
    return annotationValue;
  },

  /**
   * Returns True if the specified annotation represents a date.
   */
  annotationIsDate: function(aAnnotationName) {
    return (aAnnotationName === ArchiveAnnotations.MAFANNO_DATEARCHIVED);
  },

  // --- Private methods and properties ---

  /**
   * Sets the value of an annotation for the given ArchivePage object.
   *
   * This function accepts a Date object for annotations that represent dates.
   */
  _setAnnotationForPage: function(aPage, aAnnotationName, aAnnotationValue) {
    var annotationValue = aAnnotationValue;
    // If this annotation represents a date, convert the Date object to a
    //  comparable numeric value. If the date is unspecified, store the numeric
    //  value 0 in the annotation.
    if (ArchiveAnnotations.annotationIsDate(aAnnotationName)) {
      annotationValue = annotationValue ? annotationValue.getTime() : 0;
      // In order for the sorting to work correctly, we must store the
      //  annotation as a string, and not a numeric value. Dates before 01
      //  January, 1970 UTC are not supported at present.
      annotationValue = (annotationValue < 0) ? 0 : annotationValue;
      annotationValue = ("000000000000000" + annotationValue).slice(-16);
    }
    // Set the annotation on the page's specific archive URI. The annotations
    //  will expire when the current session terminates.
    ArchiveAnnotations._annotationService.setPageAnnotation(
     aPage.archiveUri, aAnnotationName, annotationValue, 0,
     Ci.nsIAnnotationService.EXPIRE_SESSION);
  },

  _annotationService: Cc["@mozilla.org/browser/annotation-service;1"].
   getService(Ci.nsIAnnotationService)
};