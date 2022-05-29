
Option Explicit
dim result, command, connstr, sqlcmdfilename, dbffile, dbtpath, tabfilename   

if WScript.Arguments.Count>=1 then 
  command = WScript.Arguments(0)
end if
if command="runsql" then 
  connstr = WScript.Arguments(1)
  sqlcmdfilename = WScript.Arguments(2)
  tabfilename = WScript.Arguments(3)
  result = runsql (connstr, sqlcmdfilename, tabfilename)
  'MsgBox result
  WScript.StdOut.Write result
end if

'test
function test ()
  sqlcmd = ""
  connstr = "Provider=VFPOLEDB.1;Data Source=C:\ProgramData\AVEVA Plant SCADA 2020 R2\User\proect1;Mask Password=False;Collating Sequence=MACHINE;CODEPAGE=1251;ANSI=True;"
  'name type asize zero full eng_units format comment taggenlink linked editcode
  dim i
  for i=1 to 100
    'sqlcmd = "UPDATE locvar SET  WHERE =" 
    sqlcmd = sqlcmd & "INSERT INTO locvar VALUES ('var" & i & "', 'INT', '', '','','','','','','','');" & vbCrLf
  next
  'WScript.echo sqlcmd
  runsql connstr, sqlcmd
end function 

Function runsql (connstr, sqlcmdfilename, tabfilename)
  dim result: result = ""
  dim msgs: msgs ="" 
  dim conn, rsTable, sqlcmd, sqlcmds 
  dim fso, f, f1
  dim ar, i,j
  set conn = CreateObject("ADODB.Connection")
  conn.Open connstr
  set rsTable = CreateObject("ADODB.Recordset") 'https://www.w3schools.com/asp/ado_ref_recordset.asp
  rsTable.CursorLocation = 3 'adUseClient)
  Set fso = CreateObject("Scripting.FileSystemObject")
  if fso.FileExists (tabfilename) then
    fso.DeleteFile tabfilename
  end if
  
  set f1 = fso.OpenTextFile (sqlcmdfilename)
  sqlcmd =  f1.ReadAll
  f1.Close
  sqlcmds = split(sqlcmd, ";" & chr(10))
  for j=lbound(sqlcmds) to ubound(sqlcmds)
    if len(sqlcmds(j))<5 then Exit for
    WScript.StdOut.Write sqlcmds(j) 
    rsTable.Open sqlcmds(j), conn
    if rsTable.State=1 then 
      'msgs = msgs & sendmsg("rsTable.fileds=" & rsTable.State)
      if rsTable.Fields.Count>0 then
        result = result & sendtyperesult("TABLE")
        result = result & "HEADER{"
        for i=0 to rsTable.Fields.Count-1
          result = result & rsTable.Fields.Item(i).Name
          if i<(rsTable.Fields.Count-1) then result = result & "<|||>" 
        next 
        result = result &  "}HEADER " 
      end if 
      if rsTable.RecordCount>0 then
        result = result &  "STARTTABLE{" & rsTable.GetString(,,"<|||>",chr(10)) & "}ENDTABLE" 'https://www.w3schools.com/asp/met_rs_getstring.asp#stringformatenum 
      end if
      Set f = fso.CreateTextFile(tabfilename, True)        
      f.WriteLine result
      f.Close
      rsTable.Close   
    end if
  next
  conn.Close
  runsql = msgs & result
End Function

Function sendmsg (msg)
  sendmsg = "MSG{" & msg & "}MSG" & vbCrLf 
End Function
Function sendtyperesult (typeresult)
  sendtyperesult = "TYPE{" & typeresult & "}TYPE" 
End Function
