'
' Contributed to MAF by Allister
'
Option Explicit

Dim wsShell, wsExec, wsExecExitCode

Set wsShell = CreateObject("Wscript.Shell")
Set wsExec = wsShell.Exec("""" & WScript.Arguments(0) & """ """ & WScript.Arguments(1) & """ """ & WScript.Arguments(2) & """")

Do While wsExec.Status = 0 'Wait unti the process is done executing
 WScript.Sleep 10
Loop

wsExecExitCode =  wsExec.ExitCode

Set wsExec = Nothing
Set wsShell = Nothing

WScript.Quit wsExecExitCode 'Cause the script engine host to quit with a defined exit code
