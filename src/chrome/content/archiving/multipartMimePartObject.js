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
 * Represents a multipart MIME part.
 *
 * This class derives from MimePart. See the MimePart documentation for details.
 */
function MultipartMimePart() {
  MimePart.call(this);

  // Initialize the boundary with a random string
  var randomHexString1 = Math.floor(Math.random() * 0x100000000).toString(16);
  var randomHexString2 = Math.floor(Math.random() * 0x100000000).toString(16);
  this.boundary = "----=_NextPart_000_0000_" +
   ("0000000" + randomHexString1.toUpperCase()).slice(-8) + "." +
   ("0000000" + randomHexString2.toUpperCase()).slice(-8);

  // Initialize other member variables explicitly
  this.parts = [];
}

MultipartMimePart.prototype = {
  // Derive from the MimePart class in a Mozilla-specific way. See also
  //  <https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Inheritance>
  //  (retrieved 2009-02-01).
  __proto__: MimePart.prototype,

  // --- Public methods and properties ---

  /**
   * Boundary string separating the various parts.
   */
  boundary: "",

  /**
   * Array of MimePart objects that are children of this part.
   */
  parts: [],

  // --- Overridden MimePart methods and properties ---

  get bodySection() {
    // Write the English explanatory message in the preamble
    var sectionText = "This is a multi-part message in MIME format.\r\n";
    // Add the encoded parts separated by the boundaries
    for (var [, part] in Iterator(this.parts)) {
      sectionText += "\r\n--" + this.boundary + "\r\n";
      sectionText += part.text;
    }
    // Add the trailing boundary
    return sectionText + "\r\n--" + this.boundary + "--\r\n";
  }
}