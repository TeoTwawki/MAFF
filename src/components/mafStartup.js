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
 * Implements an application startup observer. This module is just a stub, and
 *  the actual initialization of the extension is done in "startupObjects.jsm".
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
   * The real initialization is done by the MAF shared modules.
   */
  observe: function(aSubject, aTopic, aData) {
    // Import the MAF shared modules and call the functions defined there.
    //  We cannot do this in the global scope, like we do for XPCOMUtils,
    //  since our resource protocol alias may not be registered at that time.
    //  See also
    //  <http://groups.google.com/group/mozilla.dev.tech.xpcom/browse_thread/thread/6a8ea7f803ac720a>
    //  (retrieved 2008-12-07).
    var startupObjects = {};
    Cu.import("resource://maf/modules/startupObjects.jsm", startupObjects);
    startupObjects.StartupEvents.onAppStartup();
  }
};

// XPCOM component registration
var components = [MafStartup];
function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}