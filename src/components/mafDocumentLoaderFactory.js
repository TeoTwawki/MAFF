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
 * Defines a Document Loader Factory to handle the MAF document type.
 *
 * Currently, this implementation just fires the standard MAF loading process,
 *  and refuses to create a content viewer and a stream listener.
 *
 * For more information on the document loading process, see
 *  <http://www.mozilla.org/newlayout/doc/webwidget.html> and
 *  <https://developer.mozilla.org/En/The_life_of_an_HTML_HTTP_request>
 *  (retrieved 2008-10-07).
 */

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;
var Cu = Components.utils;

// This JavaScript XPCOM component is constructed using XPCOMUtils. See
//  <https://developer.mozilla.org/en/How_to_Build_an_XPCOM_Component_in_Javascript#Using_XPCOMUtils>
//  (retrieved 2008-10-07).
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

// Define a global variable shared between XUL and XPCOM
var Application = Cc["@mozilla.org/fuel/application;1"]
 .getService(Ci.fuelIApplication);
var sharedData = Application.storage.get("maf-data", null);
if (!sharedData) {
  sharedData = {};
  Application.storage.set("maf-data", sharedData);
}

/**
 * Construct the MafDocumentLoaderFactory object.
 *
 * Document loader factories are XPCOM services, so they should be constructed
 *  as singletons, for example as explained in
 *  <http://weblogs.mozillazine.org/weirdal/archives/019620.html> (retrieved
 *  2008-10-07). However, since this object doesn't store any state information,
 *  we might as well create it as a normal XPCOM object.
 *
 * Document loader factories must be registered with the
 *  "Gecko-Content-Viewers" category. For MAF, this is done dynamically during
 *  the "app-startup" notification, because the list of MIME types that this
 *  document loader factory will handle is not known in advance.
 */
function MafDocumentLoaderFactory() {

}

MafDocumentLoaderFactory.prototype = {
  // General XPCOM component attributes
  classDescription: "Mozilla Archive Format Document Loader Factory",
  classID:          Components.ID("{3b2f1177-d918-44ee-91a6-ba95954064bb}"),
  contractID:       "@amadzone.org/maf/document-loader-factory;1",
  QueryInterface:   XPCOMUtils.generateQI([Ci.nsIDocumentLoaderFactory]),

  // --- nsIDocumentLoaderFactory interface functions ---

  /*
   * For essential nsIDocumentLoaderFactory documentation, see
   *  <http://www.xulplanet.com/references/xpcomref/ifaces/nsIDocumentLoaderFactory.html>
   *  (retrieved 2008-10-07).
   */

  createInstance: function(aCommand, aChannel, aLoadGroup, aContentType,
   aContainer, aExtraInfo, aDocListenerResult) {
    // Only the "view" command is supported for MAF files
    if (aCommand != "view")
      throw Cr.NS_ERROR_NOT_IMPLEMENTED;

    // Currently we can only open MAF archives from "file://" URLs.
    localFilePath = aChannel.URI.QueryInterface(Ci.nsIFileURL).file.path;

    // Open the archive in another tab
    sharedData.mafObjectOfCurrentWindow.openFromArchive(null, localFilePath);

    // If we don't return both the content viewer and the stream listener,
    //  we should actually throw an exception. However, to avoid the exception
    //  appearing in the error console, we return null, breaking the function's
    //  contract. This behavior is the same as the one of MAF 0.6.x.
    aDocListenerResult = null;
    return null;
  },

  createInstanceForDocument: function(aContainer, aDocument, aCommand) {
    // This function should never have been called. As of 2008-10-07, it may
    //  be called only from nsDocShell::CreateAboutBlankContentViewer, that
    //  doesn't handle exceptions, so we return null instead of throwing
    //  NS_ERROR_NOT_IMPLEMENTED.
    return null;
  },

  createBlankDocument: function(aLoadGroup, aPrincipal) {
    return null; // See the comment inside createInstanceForDocument.
  }
};

// XPCOM component registration
var components = [MafDocumentLoaderFactory];
function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}