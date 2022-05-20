
dim result, command   
dim GraphicsBuilder
Set GraphicsBuilder = WScript.CreateObject("GraphicsBuilder.Application")
WScript.Echo "----------"
if WScript.Arguments.Count>=1 then 
  command = WScript.Arguments(0)
end if
if command="create_varpages" then 
  create_varpages WScript.Arguments(1), WScript.Arguments(2), WScript.Arguments(3), WScript.Arguments(4), WScript.Arguments(5), WScript.Arguments(6), WScript.Arguments(7)
end if

function create_varpages (ctprojectname, pfwincludename, dis, dos, ais, aos, cfgparas)
  dim ardis, ardos, arais, araos 
  dim prselected
  ardis = Split(dis,",") 
  ardos = Split(dos,",") 
  arais = Split(ais,",") 
  araos = Split(aos,",") 
  arcfgparas = Split(cfgparas,",")
  for i=lbound(arcfgparas) to ubound(arcfgparas)
    para = Split(arcfgparas(i),":")
    select case para(0)
     Case "dicnt"  
       dicnt = para(1)
     Case "aicnt"  
       aicnt = para(1)
     Case "docnt"  
       docnt = para(1)
     Case "aocnt"  
       aocnt = para(1)
    End Select 
  next 
  On Error Resume Next
  Err.Clear
  
  create_varpage ctprojectname, pfwincludename, "AIVAR", "AIVAR_HMI", arais, aicnt
  create_varpage ctprojectname, pfwincludename, "DIVAR", "DIVAR_HMI", ardis, dicnt
  create_varpage ctprojectname, pfwincludename, "DOVAR", "DOVAR_HMI", ardos, docnt
  create_varpage ctprojectname, pfwincludename, "AOVAR", "AOVAR_HMI", araos, aocnt


end function 

function create_varpage (ctprojectname, pfwincludename, pagebasename, typename, artags, cnt) 
  dim j
  strtan = 10000 'AN для першого розміщення обєкту 
  GraphicsBuilder.PageOpenEx pfwincludename, "PACFramework", "group", 1
  GraphicsBuilder.PageSelectObject strtan
  strtx = GraphicsBuilder.AttributeX
  strty = GraphicsBuilder.AttributeY
  x = strtx
  y = strty
  pageidx = 1
  If Err.Number <> 0 Then
    WScript.Echo "Could not open page " & pagebasename & pageidx
    return
  else
    j = 0 
    for i=lbound(artags) to ubound(artags)
      GraphicsBuilder.LibraryObjectPlaceEx ctprojectname, "pacframework", typename, 1, true, x, y
      GraphicsBuilder.LibraryObjectPutProperty "Tag", artags(i)
      'WScript.Echo artags(i)
      if i = lbound(artags) then
        width = GraphicsBuilder.AttributeExtentX - x
        hight = GraphicsBuilder.AttributeExtentY - y 
      end if
      'WScript.Echo  strty
      y = y + hight + 2
      if j=cnt-1 then
        WScript.Echo "Genie " & pagebasename & pageidx & " saved" 
        GraphicsBuilder.PageSaveAsEx ctprojectname, "PACFramework", pagebasename & pageidx
        GraphicsBuilder.PageClose
        if i<ubound(artags) then 
          y = strty 
          GraphicsBuilder.PageOpenEx pfwincludename, "PACFramework", "group", 1
          GraphicsBuilder.LibraryObjectPlaceEx ctprojectname, "pacframework", typename, 1, true, x, y
        end if
        j = 0
        pageidx = pageidx + 1
      else 
        j = j + 1   
      end if  
    next 
  End If
  if j<>0 then 
    WScript.Echo  "------------------------"
    GraphicsBuilder.PageSaveAsEx ctprojectname, "PACFramework", pagebasename & pageidx
    GraphicsBuilder.PageClose
  end if  

end function