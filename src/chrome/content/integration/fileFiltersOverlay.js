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
 * This overlay adds the Mozilla Archive Format save behaviors to the browser.
 */

var gMafDefaultSaveBehavior;

FileFilters.saveFilters.forEach(function(curFilter, curFilterIndex) {

  // Create the new save behavior object
  var newSaveBehavior = new InternalSaveBehavior();
  newSaveBehavior.isComplete = true;
  newSaveBehavior.mandatoryExtension = true;
  newSaveBehavior.isValidForSaveMode = function(aSaveMode) {
    return aSaveMode & SAVEMODE_MAFARCHIVE;
  }
  newSaveBehavior.getFileFilter = function(aContentType, aFileExtension) {
    // Access the current values in the MAF save filter objects array
    var filter = FileFilters.saveFilters[curFilterIndex];
    // Return the required values
    return {title: filter.title, extensionstring: filter.extensionString};
  }
  newSaveBehavior.getPersistObject = function(saveBrowsers) {
    return new MafArchivePersist(saveBrowsers, curFilter.mafArchiveType);
  }

  // Add the save behavior to the browser, before the one already present at
  //  index 2, assuming it is the one for saving as text only.
  gInternalSaveBehaviors.splice(2 + curFilterIndex, 0, newSaveBehavior);

  // Save a reference to the first save behavior, considered the default
  if (curFilterIndex == 0) {
    gMafDefaultSaveBehavior = newSaveBehavior;
  }
});