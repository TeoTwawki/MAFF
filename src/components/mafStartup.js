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
 * Implements an application startup observer. On startup, MAF dynamically
 *  initializes the MIME types and file extensions it can handle.
 */

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;
var Cu = Components.utils;

// This JavaScript XPCOM component is constructed using XPCOMUtils. See
//  <https://developer.mozilla.org/en/How_to_Build_an_XPCOM_Component_in_Javascript#Using_XPCOMUtils>
//  (retrieved 2008-10-07).
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

function MafStartup() {

}

MafStartup.prototype = {
  // General XPCOM component attributes
  classDescription: "Mozilla Archive Format Startup Observer",
  classID:          Components.ID("{37116274-8df3-4d48-8533-00eae60c844c}"),
  contractID:       "@amadzone.org/maf/startup-observer;1",
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIObserver]),

  // Use XPCOMUtils to register with the category manager. The classDescription
  //  and contractID will be used during registration. For more information,
  //  see <https://developer.mozilla.org/en/Observer_Notifications> (retrieved
  //  2008-11-21).
  _xpcom_categories: [{category: "app-startup", service: true}],

  // --- nsIObserver interface functions ---

  /**
   * This function is called with aTopic set to "app-startup" when the
   *  application starts, before the first browser window is opened.
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
   */
  observe: function(aSubject, aTopic, aData) {
    // Get references to the XPCOM services used here. The nsIMIMEService
    //  interface is also exposed by the component whose contract ID is
    //  "@mozilla.org/uriloader/external-helper-app-service;1", but
    //  "@mozilla.org/mime;1" can be used indifferently.
    var categoryManager = Cc["@mozilla.org/categorymanager;1"]
     .getService(Ci.nsICategoryManager);
    var mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);

    // This object will be filled in with properties whose name is the MIME type
    //  we need to handle, and whose value is true if MAF is the extension that
    //  must preferably handle that MIME type.
    mimeList = {};

    // First of all, for all the file extensions we handle, we must ensure that
    //  the application is able to determine a specific MIME type. If there are
    //  no other means to determine the MIME type, the last resort is the
    //  "ext-to-type-mapping" category, so we set a key there for every
    //  file extension to be handled. 
    [
     {ext: "mhtml", mimeType: "application/x-mht", replace: false},
     {ext: "mht",   mimeType: "application/x-mht", replace: false},
     {ext: "maff",  mimeType: "application/x-maf", replace: true}
    ].forEach(function(item) {
      // Add the entry, without persisting it, and replacing an existing entry
      //  only for the file types that are preferably managed by this extension
      categoryManager.addCategoryEntry("ext-to-type-mapping",
       item.ext, item.mimeType, false, item.replace);
      // While we are here, find out the actual MIME type that will be used for
      //  the file extension, and populate the mimeList array accordingly. See
      //  <https://developer.mozilla.org/En/How_Mozilla_determines_MIME_Types>
      //  (retrieved 2008-11-21).
      var realMimeType = mimeService.getTypeFromExtension(item.ext);
      mimeList[realMimeType] = item.replace;
    });

    // Next, we must register the document loader factories for the MIME types
    //  we need to handle. Depending on the MIME type, we may need to override
    //  a document loader factory previously registered by another extension.
    for (var mimeTypeToHandle in mimeList) {
      if (mimeList.hasOwnProperty(mimeTypeToHandle)) {
        // Add the entry, without persisting it, and replacing an existing entry
        //  only for the MIME types that are preferably managed by this
        //  extension
        categoryManager.addCategoryEntry("Gecko-Content-Viewers",
         mimeTypeToHandle, "@amadzone.org/maf/document-loader-factory;1",
         false, mimeList[mimeTypeToHandle]);
      }
    }
  }
};

// XPCOM component registration
var components = [MafStartup];
function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}