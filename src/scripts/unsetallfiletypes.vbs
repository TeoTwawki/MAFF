'
' Contributed to MAF by Michael (mcm.ham)
'

On Error Resume Next
Set WShell = WScript.CreateObject("WScript.Shell")

'Undo .MAF and .MAFF association with Firefox
WShell.RegDelete "HKCR\.MAF\" 'Only this needs to be removed for .MAF support
WShell.RegDelete "HKCR\.MAFF\" 'Only this needs to be removed for .MAFF support

WShell.RegDelete "HKCR\MozillaMAF\DefaultIcon\"
WShell.RegDelete "HKCR\MozillaMAF\shell\Open\command\"
WShell.RegDelete "HKCR\MozillaMAF\shell\Open\"
WShell.RegDelete "HKCR\MozillaMAF\shell\"
WShell.RegDelete "HKCR\MozillaMAF\"

'Restore previous program back to .mht files
WShell.RegWrite "HKCR\mhtmlfile\shell\", "open", "REG_SZ"
WShell.RegDelete "HKCR\mhtmlfile\shell\OpenWithMAF\command\"
WShell.RegDelete "HKCR\mhtmlfile\shell\OpenWithMAF\"
