Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000", 0, False
WScript.Sleep 1000
WshShell.Run "http://127.0.0.1:8000"
