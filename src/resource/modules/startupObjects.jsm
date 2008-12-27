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
 * This module contains all the objects that are used only during the extension
 *  initialization and, symmetrically, on shutdown. The main entry point is the
 *  "StartupEvents.onAppStartup" method.
 */

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;
var Cu = Components.utils;

// Define symbols available to users of this JavaScript Module
var EXPORTED_SYMBOLS = ["StartupEvents"];

/**
 * This object handles extension startup and shutdown, and acts as bookkeeper
 *  for the related observer registrations. Actual work is delegated to the
 *  StartupInitializer object.
 */
var StartupEvents = {

  /**
   * This function must be called once on application startup, and simply
   *  registers with the host application for other notifications, to be
   *  handled by the "observe" function.
   */
  onAppStartup: function() {
    this._observerService.addObserver(this, "profile-after-change", false);
    this._observerService.addObserver(this, "xpcom-shutdown", false);
  },

  /** Called when it is time to unregister all the observers. */
  onAppShutdown: function() {
    this._observerService.removeObserver(this, "profile-after-change");
    this._observerService.removeObserver(this, "xpcom-shutdown");
  },

  /** Called when a user profile has fully loaded. */
  afterProfileChange: function() {
    // Initialize the extension behavior
    StartupInitializer.initFromCurrentProfile();
  },

  // --- nsIObserver interface functions ---

  /**
   * This function handles all the notifications related to application startup
   *  and shutdown. The aTopic argument is used to distinguish between
   *  notifications.
   */
  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "profile-after-change") { this.afterProfileChange(); }
    if (aTopic == "xpcom-shutdown")       { this.onAppShutdown();      }
  },

  // --- Private methods and properties ---

  _observerService: Cc["@mozilla.org/observer-service;1"]
   .getService(Ci.nsIObserverService)
};

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
    // Get references to the XPCOM services used here. The nsIMIMEService
    //  interface is also exposed by the component whose contract ID is
    //  "@mozilla.org/uriloader/external-helper-app-service;1", but
    //  "@mozilla.org/mime;1" can be used indifferently.
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
     {ext: "mhtml", mimeType: "application/x-mht",  replace: false},
     {ext: "mht",   mimeType: "application/x-mht",  replace: false},
     {ext: "maff",  mimeType: "application/x-maff", replace: true}
    ].forEach(function(item) {
      // Add the entry, without persisting it, and replacing an existing entry
      //  only for the file types that are preferably managed by this extension
      this._addCategoryEntryForSession("ext-to-type-mapping",
       item.ext, item.mimeType, item.replace);
      // While we are here, find out the actual MIME type that will be used for
      //  the file extension, and populate the mimeList array accordingly. See
      //  <https://developer.mozilla.org/En/How_Mozilla_determines_MIME_Types>
      //  (retrieved 2008-11-21).
      var realMimeType = mimeService.getTypeFromExtension(item.ext);
      mimeList[realMimeType] = item.replace;
    }, this);

    // Next, we must register the document loader factories for the MIME types
    //  we need to handle. Depending on the MIME type, we may need to override
    //  a document loader factory previously registered by another extension.
    for (var mimeTypeToHandle in mimeList) {
      if (mimeList.hasOwnProperty(mimeTypeToHandle)) {
        // Add the entry, without persisting it, and replacing an existing entry
        //  only for the MIME types that are preferably managed by this
        //  extension
        this._addCategoryEntryForSession("Gecko-Content-Viewers",
         mimeTypeToHandle, "@amadzone.org/maf/document-loader-factory;1",
         mimeList[mimeTypeToHandle]);
      }
    }
  },

  // --- Private methods and properties ---

  /**
   * Calls nsICategoryManager.addCategoryEntry with aPersist set to false, but
   *  if aReplace is false and the category entry already has a value, no
   *  exception is thrown.
   * 
   * @param aCategory   The name of the category being modified.
   * @param aEntry      The name of the category entry being modified.
   * @param aValue      The value for the category entry.
   * @param aReplace    A flag indicating whether or not to overwrite the value
   *                    of an existing category entry.
   */
  _addCategoryEntryForSession: function(aCategory, aEntry, aValue, aReplace) {
    try {
      this._categoryManager.addCategoryEntry(aCategory, aEntry, aValue, false,
       aReplace);
    } catch (e) {
      // Ignore only the NS_ERROR_INVALID_ARG result
      if (!(e instanceof Ci.nsIXPCException) || (e.result !=
       Cr.NS_ERROR_INVALID_ARG)) {
        throw e;
      }
    }
  },

  _categoryManager: Cc["@mozilla.org/categorymanager;1"]
   .getService(Ci.nsICategoryManager)
};
