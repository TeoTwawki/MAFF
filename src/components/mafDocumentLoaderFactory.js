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
 * Helper object for nsIDocumentLoaderFactory.createInstance implementation.
 */
var EmptyStreamListener = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIStreamListener]),

  // --- nsIStreamListener interface functions ---

  onStartRequest: function(aRequest, aContext) { },
  onStopRequest: function(aRequest, aContext, aStatusCode) { },
  onDataAvailable: function (aRequest, aContext, aInputStream, aOffset,
   aCount) {
    // To implement the interface correctly, we must read the exact number of
    //  bytes specified in aCount from the input stream. We have to use a
    //  scriptable stream to read from the provided normal stream. We could
    //  also throw an exception to abort the request, but the exception would
    //  appear in the Error Console.
    var scrInputStream = Cc["@mozilla.org/scriptableinputstream;1"]
     .createInstance(Ci.nsIScriptableInputStream);
    scrInputStream.init(aInputStream);
    scrInputStream.read(aCount);
    scrInputStream.close();
  }
};

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
 *  "Gecko-Content-Viewers" category. For MAF, this is done dynamically on
 *  startup, because the list of MIME types that this document loader factory
 *  will handle is not known in advance.
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
    var localFile = aChannel.URI.QueryInterface(Ci.nsIFileURL).file;

    // Extract the archive, and store the URI of the first page. Other pages are
    //  opened in other tabs at this point, if required. Note: there is
    //  currently no mechanism in place to avoid extracting the archive or
    //  opening the other tabs multiple times if the original page is refreshed.
    var contentURISpec = sharedData.mafObjectOfCurrentWindow.openFromArchive(
     null, localFile, true);
    // If no data is available or should be shown, display an empty page
    if (!contentURISpec) {
      contentURISpec = "about:blank";
    }

    // Create and start a content viewer for the archive contents. For now,
    //  assume that the content type is "text/html".
    var contentURI = Cc['@mozilla.org/network/io-service;1']
     .getService(Ci.nsIIOService).newURI(contentURISpec, "utf-8", null);
    var originalContentViewer = this._startActualContentViewer(contentURI,
     "text/html", aLoadGroup, aContainer, aExtraInfo);

    // Return the content viewer, which is already receiving data from our
    //  channel, and a dummy stream listener, to throw away data from the
    //  original channel (aChannel). 
    aDocListenerResult.value = EmptyStreamListener;
    return originalContentViewer;
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
  },

  // --- Private functions ---

  /**
   * Creates and starts a content viewer from the application's built-in
   *  Document Loader Factory, to display the specified URI. The provided
   *  content viewer can then be returned from an implementation of
   *  nsIDocumentLoaderFactory.createInstance.
   *
   * @param aContentURI    The URI of the content to be displayed.
   * @param aContentType   The MIME content type of the content to be displayed.
   * @param aLoadGroup     See nsIDocumentLoaderFactory.createInstance.
   * @param aContainer     See nsIDocumentLoaderFactory.createInstance.
   * @param aExtraInfo     See nsIDocumentLoaderFactory.createInstance.
   *
   * @return   The newly constructed content viewer.
   */
  _startActualContentViewer: function(aContentURI, aContentType, aLoadGroup,
   aContainer, aExtraInfo) {
    // Create a new channel to feed the new content viewer
    var contentChannel = Cc['@mozilla.org/network/io-service;1']
     .getService(Ci.nsIIOService).newChannelFromURI(aContentURI);

    // The content type of the channel should match the content type of the
    //  content viewer, otherwise the content might not be displayed correctly.
    contentChannel.contentType = aContentType;

    // Ask the application's built-in document loader factory to provide a
    //  content viewer and a stream listener for our channel
    var originalDocListenerResult = {};
    var originalContentViewer =
     Cc['@mozilla.org/content/document-loader-factory;1']
     .getService(Ci.nsIDocumentLoaderFactory)
     .createInstance("view", contentChannel, aLoadGroup, aContentType,
     aContainer, aExtraInfo, originalDocListenerResult);
    originalDocListener = originalDocListenerResult.value.QueryInterface(
     Ci.nsIStreamListener);

    // Start feeding data to the provided stream listener
    contentChannel.asyncOpen(originalDocListener, null);

    // Return the now running content viewer
    return originalContentViewer;
  }
};

// XPCOM component registration
var components = [MafDocumentLoaderFactory];
function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}