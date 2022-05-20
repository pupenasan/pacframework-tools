  dim GraphicsBuilder
  Set GraphicsBuilder = WScript.CreateObject("GraphicsBuilder.Application")

  'On Error Resume Next
  Err.Clear
  dim pagename, ctprojectname, strtan
  ctprojectname = "ExampleSA2"
  pagename = "AIVAR1"
  strtan = 10000 
  GraphicsBuilder.PageOpen ctprojectname, pagename 
  If Err.Number <> 0 Then
    WScript.Echo Err.Number
  else 
    dim strtx, strty
    GraphicsBuilder.PageSelectObject strtan
    strtx = GraphicsBuilder.AttributeX
    strty = GraphicsBuilder.AttributeY
    'WScript.Echo strtx & " " & strty
    GraphicsBuilder.LibraryObjectPlaceEx ctprojectname, "pacframework", "AIVAR_HMI", 1, true, strtx, strty
    GraphicsBuilder.LibraryObjectPutProperty "Tag", "T1_LT1"
    'WScript.Echo GraphicsBuilder.AttributeX 
    width = GraphicsBuilder.AttributeExtentX - strtx
    hight = GraphicsBuilder.AttributeExtentY - strty 
    'WScript.Echo  width & " " & hight 
    
  End If

  'GraphicsBuilder.PageSelect("BaseName", "Filename")
  