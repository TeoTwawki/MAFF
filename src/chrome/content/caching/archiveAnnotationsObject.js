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
     [ArchiveAnnotations.MAFANNO_TEMPURI,
      (aPage.tempUri ? aPage.tempUri.spec : "")],
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
    // If the value represents an URI, store this information in the value
    //  itself. This allows for properly displaying the value later. The
    //  annotation should not be added if the value is empty, otherwise the
    //  tests to detect this condition will provide incorrect results.
    } else if (annotationValue && ArchiveAnnotations.annotationIsEscapedAsUri(
     aAnnotationName)) {
      annotationValue = new String(annotationValue);
      annotationValue.isEscapedAsUri = true;
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

  /**
   * Returns True if the specified annotation represents an URI or part of it.
   */
  annotationIsEscapedAsUri: function(aAnnotationName) {
    return [
     ArchiveAnnotations.MAFANNO_ORIGINALURL,
     ArchiveAnnotations.MAFANNO_ARCHIVENAME,
     ArchiveAnnotations.MAFANNO_TEMPURI,
     ArchiveAnnotations.MAFANNO_DIRECTARCHIVEURI
    ].indexOf(aAnnotationName) >= 0;
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
     aPage.archiveUri, aAnnotationName, annotationValue || "", 0,
     Ci.nsIAnnotationService.EXPIRE_SESSION);
  },

  /**
   * Returns a reference to the annotation service.
   */
  get _annotationService() {
    return Cc["@mozilla.org/browser/annotation-service;1"].
     getService(Ci.nsIAnnotationService);
  }
};