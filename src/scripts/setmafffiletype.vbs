'
' Contributed to MAF by Michael (mcm.ham)
'

On Error Resume Next
Set WShell = WScript.CreateObject("WScript.Shell")

'Get current Mozilla browser path
MOZILLA_EXE = "%%MOZILLA_EXE%%"

'Creates MozillaMAF Filetype
WShell.RegWrite "HKCR\MozillaMAF\", "Mozilla Archive Format", "REG_SZ"
WShell.RegWrite "HKCR\MozillaMAF\DefaultIcon\", MOZILLA_EXE & ",1", "REG_SZ"
WShell.RegWrite "HKCR\MozillaMAF\shell\", "Open", "REG_SZ"
WShell.RegWrite "HKCR\MozillaMAF\shell\Open\", "&Open", "REG_SZ"
WShell.RegWrite "HKCR\MozillaMAF\shell\Open\command\", MOZILLA_EXE & " " & Chr(34) & "%1" & Chr(34), "REG_SZ"

'Associate .MAFF extension with Mozilla browser
WShell.RegWrite "HKCR\.MAFF\", "MozillaMAF", "REG_SZ"
