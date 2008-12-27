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
    // Register our Document Loader Factory for every handled file type. MAF is
    //  the extension that will preferably handle the MAFF file format, while it
    //  will handle MHTML only if no other extension does it.
    new DlfRegisterer("@amadzone.org/maf/document-loader-factory;1")
     .addFileExtension("mhtml", "application/x-mht",  false)
     .addFileExtension("mht",   "application/x-mht",  false)
     .addFileExtension("maff",  "application/x-maff", true)
     .register();
  },
};

/**
 * This object takes care of registering the specified Document Loader Factory
 *  in the "Gecko-Content-Viewers" category, for specific MIME types or file
 *  extensions.
 *
 * To use this object, firstly call the addMimeType or addFileExtension methods,
 *  then call the register method.
 *
 * All the changes made by this object are valid only for the current
 *  application session.
 *
 * For more information on the document loading process, see
 *  <http://www.mozilla.org/newlayout/doc/webwidget.html> and
 *  <https://developer.mozilla.org/En/The_life_of_an_HTML_HTTP_request>
 *  (retrieved 2008-12-27).
 */
function DlfRegisterer(aDlfContractId) {
  this.dlfContractId = aDlfContractId;
}

DlfRegisterer.prototype = {
  // --- Public properties ---

  /** Contract ID of the Document Loader Factory to be registered */
  dlfContractId: null,

  // --- Public methods and properties ---

  /**
   * Prepare for registering the DLF with the specified MIME type.
   *
   * @param aMimeType           The MIME type to be managed.
   * @param aIsRecommended      True if this DLF is the one that should
   *                             preferably handle the associated type.
   *
   * @return Reference to this object, for fluent interface support.
   */
  addMimeType: function(aMimeType, aIsRecommended) {
    // If the the type was already added with aIsRecommended set to true, leave
    //  it alone even if aIsRecommended is now false.
    if (!this._mimeList[aMimeType]) {
      this._mimeList[aMimeType] = aIsRecommended;
    }
    return this;
  },

  /**
   * Prepare for registering the DLF with the MIME type actually associated with
   *  the specified file extension.
   *
   * @param aExtension          The file extension to be managed.
   * @param aPossibleMimeType   Suggestion for a possible MIME type to be
   *                             associated with the file extension.
   * @param aIsRecommended      True if this DLF is the one that should
   *                             preferably handle the associated type.
   *
   * @return Reference to this object, for fluent interface support.
   */
  addFileExtension: function(aExtension, aPossibleMimeType, aIsRecommended) {
    // First of all, for the specified file extensions, we must ensure that the
    //  application is able to determine a specific MIME type. If there are no
    //  other means to determine the MIME type, the last resort is the
    //  "ext-to-type-mapping" category, so we set an entry there, replacing an
    //  existing entry only for the file extensions that are preferably managed
    //  by this DLF.
    this._addCategoryEntryForSession("ext-to-type-mapping", aExtension,
     aPossibleMimeType, aIsRecommended);
 
    // Find out the actual MIME type that will be used for the file extension,
    //  and register the DLF for handling it. See also
    //  <https://developer.mozilla.org/En/How_Mozilla_determines_MIME_Types>
    //  (retrieved 2008-11-21).
    var realMimeType = this._mimeService.getTypeFromExtension(aExtension);
    this.addMimeType(realMimeType, aIsRecommended);
    return this;
  },

  /**
   * Perform the actual registration.
   */
  register: function() {
    // For every MIME type that was specified
    for (var mimeTypeToHandle in this._mimeList) {
      if (this._mimeList.hasOwnProperty(mimeTypeToHandle)) {
        // Add the appropriate category entry, without persisting it, and
        //  replacing an existing entry only for the MIME types that are
        //  preferably managed by this DLF.
        this._addCategoryEntryForSession("Gecko-Content-Viewers",
         mimeTypeToHandle, this.dlfContractId,
         this._mimeList[mimeTypeToHandle]);
      }
    }
  },

  // --- Private methods and properties ---

  /**
   * This object will be filled in with properties whose name is the MIME type
   *  we need to handle, and whose value is true if this is the DLF that should
   *  preferably handle that MIME type.
   */
  _mimeList: {},

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
   .getService(Ci.nsICategoryManager),

  // The nsIMIMEService interface is also exposed by the component whose
  //  contract ID is "@mozilla.org/uriloader/external-helper-app-service;1", but
  //  "@mozilla.org/mime;1" can be used indifferently.
  _mimeService: Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService)
};