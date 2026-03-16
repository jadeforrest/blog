#!/usr/bin/env python3
"""
Test whether Kit's editor accepts pasted HTML.
Puts a rich HTML snippet on the clipboard as text/html,
then open the Kit editor and paste it in.
"""

import AppKit

TEST_HTML = """
<h2>Clipboard HTML Test</h2>
<p>This is a <strong>bold</strong> and <em>italic</em> paragraph.</p>
<ul>
  <li>Item one</li>
  <li>Item two</li>
</ul>
<p>If this pastes as formatted text (not raw tags), the approach works.</p>
"""

pb = AppKit.NSPasteboard.generalPasteboard()
pb.clearContents()
pb.setString_forType_(TEST_HTML.strip(), AppKit.NSPasteboardTypeHTML)
print("HTML copied to clipboard.")
print("Now paste (Cmd+V) into the Kit email editor and see if it renders as formatted content.")
