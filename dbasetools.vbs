
Option Explicit
dim result, command, connstr, sqlcmd, dbffile, dbtpath   

if WScript.Arguments.Count>=1 then 
  command = WScript.Arguments(0)
end if
if command="runsql" then 
  connstr = WScript.Arguments(1)
  sqlcmd = WScript.Arguments(2)
  result = runsql (connstr, sqlcmd)
  'MsgBox result
  WScript.StdOut.Write result
end if


Function runsql (connstr, sqlcmd)
  dim result: result = ""
  dim msgs: msgs ="" 
  dim conn: set conn = CreateObject("ADODB.Connection")
  conn.Open connstr
  dim rsTable: set rsTable = CreateObject("ADODB.Recordset") 'https://www.w3schools.com/asp/ado_ref_recordset.asp
  rsTable.CursorLocation = 3 'adUseClient)
  rsTable.Open sqlcmd, conn
  if rsTable.State=1 then 
    'msgs = msgs & sendmsg("rsTable.fileds=" & rsTable.State)
    if rsTable.Fields.Count>0 then
      result = result & sendtyperesult("TABLE")
      result = result & "HEADER{"
      dim i
      for i=0 to rsTable.Fields.Count-1
        result = result & rsTable.Fields.Item(i).Name
        if i<(rsTable.Fields.Count-1) then result = result & "<|||>" 
      next 
      result = result &  "}HEADER " 
    end if 
    if rsTable.RecordCount>0 then
      result = result &  "STARTTABLE{" & rsTable.GetString(,,"<|||>","<===>") & "}ENDTABLE" 'https://www.w3schools.com/asp/met_rs_getstring.asp#stringformatenum  
    end if
    rsTable.Close
    conn.Close
  end if
  runsql = msgs & result
End Function

Function sendmsg (msg)
  sendmsg = "MSG{" & msg & "}MSG" & vbCrLf 
End Function
Function sendtyperesult (typeresult)
  sendtyperesult = "TYPE{" & typeresult & "}TYPE" 
End Function
