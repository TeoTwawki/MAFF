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
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Blake Ross <blake@cs.stanford.edu>
 *   David Hyatt <hyatt@mozilla.org>
 *   Peter Annema <disttsc@bart.nl>
 *   Dean Tessman <dean_tessman@hotmail.com>
 *   Kevin Puetz <puetzk@iastate.edu>
 *   Ben Goodger <ben@netscape.com>
 *   Pierre Chanial <chanial@noos.fr>
 *   Jason Eager <jce2@po.cwru.edu>
 *   Joe Hewitt <hewitt@netscape.com>
 *   Alec Flett <alecf@netscape.com>
 *   Asaf Romano <mozilla.mano@sent.com>
 *   Jason Barnabe <jason_barnabe@fastmail.fm>
 *   Peter Parente <parente@cs.unc.edu>
 *   Giorgio Maone <g.maone@informaction.com>
 *   Tom Germeau <tom.germeau@epigoon.com>
 *   Jesse Ruderman <jruderman@gmail.com>
 *   Joe Hughes <joe@retrovirus.com>
 *   Pamela Greene <pamg.bugs@gmail.com>
 *   Michael Ventnor <m.ventnor@gmail.com>
 *   Simon Bünzli <zeniko@gmail.com>
 *   Johnathan Nightingale <johnath@mozilla.com>
 *   Ehsan Akhgari <ehsan.akhgari@gmail.com>
 *   Dão Gottwald <dao@mozilla.com>
 *   Thomas K. Dyas <tdyas@zecador.org>
 *   Edward Lee <edward.lee@engineering.uiuc.edu>
 *   Paul O’Shannessy <paul@oshannessy.com>
 *   Nils Maier <maierman@web.de>
 *   Rob Arnold <robarnold@cmu.edu>
 *   Dietrich Ayala <dietrich@mozilla.com>
 *   Paolo Amadini <http://www.amadzone.org/>
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

function BrowserOpenFileWindow()
{
  // Ensure that the variable gLastOpenDirectory is declared
  var gLastOpenDirectory = gLastOpenDirectory;

  // Get filepicker component.
  try {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, gNavigatorBundle.getString("openFile"), nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterText | nsIFilePicker.filterImages |
                     nsIFilePicker.filterXML | nsIFilePicker.filterHTML);
    if (gLastOpenDirectory)
      fp.displayDirectory = gLastOpenDirectory.path;

    // Add filters from Mozilla Archive Format
    MozillaArchiveFormat.FileFilters.openFilters.forEach(function(curFilter) {
      fp.appendFilter(curFilter.title, curFilter.extensionString);
    });

    fp.appendFilters(nsIFilePicker.filterAll);

    // Show the filepicker, and remember the selected file filter
    fp.filterIndex = MozillaArchiveFormat.DynamicPrefs.openFilterIndex;
    if (fp.show() == nsIFilePicker.returnOK) {
      if (gLastOpenDirectory && fp.file && fp.file.exists())
        gLastOpenDirectory.path = fp.file.parent.QueryInterface(Ci.nsILocalFile);
      MozillaArchiveFormat.DynamicPrefs.openFilterIndex = fp.filterIndex;
      openTopWin(fp.fileURL.spec);
    }
  } catch (ex) {
  }
}
