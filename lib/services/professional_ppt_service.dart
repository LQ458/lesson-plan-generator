import 'dart:typed_data';
import 'dart:convert';
import 'package:archive/archive.dart';
import '../models/lesson_plan.dart';

class ProfessionalPPTService {
  // 生成专业PPT
  static Future<Uint8List> generateProfessionalPPT(LessonPlan lesson) async {
    // 创建PPTX文件结构
    final archive = Archive();
    
    // 添加专业PPTX文件结构
    _addProfessionalPPTXStructure(archive, lesson);
    
    // 将Archive转换为字节
    final encodedArchive = ZipEncoder().encode(archive);
    return Uint8List.fromList(encodedArchive!);
  }
  
  // 添加专业PPTX文件结构
  static void _addProfessionalPPTXStructure(Archive archive, LessonPlan lesson) {
    // [Content_Types].xml
    archive.addFile(ArchiveFile('[Content_Types].xml', 0, _getContentTypesXml()));
    
    // _rels/.rels
    archive.addFile(ArchiveFile('_rels/.rels', 0, _getRelsXml()));
    
    // ppt/presentation.xml
    archive.addFile(ArchiveFile('ppt/presentation.xml', 0, _getPresentationXml()));
    
    // ppt/_rels/presentation.xml.rels
    archive.addFile(ArchiveFile('ppt/_rels/presentation.xml.rels', 0, _getPresentationRelsXml()));
    
    // 幻灯片文件 - 7张专业幻灯片
    for (int i = 1; i <= 7; i++) {
      archive.addFile(ArchiveFile('ppt/slides/slide$i.xml', 0, _getSlideXml(i, lesson)));
      archive.addFile(ArchiveFile('ppt/slides/_rels/slide$i.xml.rels', 0, _getSlideRelsXml(i)));
    }
    
    // 布局和主题文件
    archive.addFile(ArchiveFile('ppt/slideLayouts/slideLayout1.xml', 0, _getSlideLayoutXml()));
    archive.addFile(ArchiveFile('ppt/slideLayouts/slideLayout2.xml', 0, _getTitleSlideLayoutXml()));
    archive.addFile(ArchiveFile('ppt/slideMasters/slideMaster1.xml', 0, _getSlideMasterXml()));
    archive.addFile(ArchiveFile('ppt/theme/theme1.xml', 0, _getProfessionalThemeXml()));
  }
  
  // 专业PPT的XML文件生成
  static List<int> _getContentTypesXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide4.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide5.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide6.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide7.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
</Types>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getRelsXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getPresentationXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" 
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
    <p:sldId id="257" r:id="rId3"/>
    <p:sldId id="258" r:id="rId4"/>
    <p:sldId id="259" r:id="rId5"/>
    <p:sldId id="260" r:id="rId6"/>
    <p:sldId id="261" r:id="rId7"/>
    <p:sldId id="262" r:id="rId8"/>
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <p:defaultTextStyle>
    <a:defPPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:defRPr lang="zh-CN" sz="1800"/>
    </a:defPPr>
  </p:defaultTextStyle>
</p:presentation>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getPresentationRelsXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide4.xml"/>
  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide5.xml"/>
  <Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide6.xml"/>
  <Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide7.xml"/>
</Relationships>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getSlideXml(int slideNumber, LessonPlan lesson) {
    String title = '';
    String content = '';
    
    switch (slideNumber) {
      case 1: // 标题页
        title = lesson.title;
        content = '${lesson.subject} • ${lesson.grade} • ${lesson.duration}';
        break;
      case 2: // 课程概览
        title = '课程概览';
        content = '学科：${lesson.subject} 年级：${lesson.grade} 课时：${lesson.duration} 重点：掌握核心知识点 难点：理解深层含义';
        break;
      case 3: // 教学目标
        title = '教学目标';
        content = _extractBulletPointsText(lesson.objectives);
        break;
      case 4: // 教学内容
        title = '教学内容';
        content = _extractBulletPointsText(lesson.content);
        break;
      case 5: // 教学方法
        title = '教学方法';
        content = _extractBulletPointsText(lesson.methods);
        break;
      case 6: // 教学评估
        title = '教学评估';
        content = _extractBulletPointsText(lesson.assessment);
        break;
      case 7: // 总结页
        title = '感谢聆听';
        content = '期待与同学们的精彩互动！';
        break;
    }
    
    final xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" 
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0">
              <a:srgbClr val="F8F9FA"/>
            </a:gs>
            <a:gs pos="100000">
              <a:srgbClr val="FFFFFF"/>
            </a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="1"/>
        </a:gradFill>
      </p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      
      <!-- 装饰性顶部色带 -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="TopBand"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="12192000" cy="200000"/>
          </a:xfrm>
          <a:custGeom>
            <a:avLst/>
            <a:gdLst/>
            <a:ahLst/>
            <a:cxnLst/>
            <a:rect l="0" t="0" r="12192000" b="200000"/>
            <a:pathLst>
              <a:path w="12192000" h="200000">
                <a:moveTo>
                  <a:pt x="0" y="0"/>
                </a:moveTo>
                <a:lnTo>
                  <a:pt x="12192000" y="0"/>
                </a:lnTo>
                <a:lnTo>
                  <a:pt x="12192000" y="200000"/>
                </a:lnTo>
                <a:lnTo>
                  <a:pt x="0" y="200000"/>
                </a:lnTo>
                <a:close/>
              </a:path>
            </a:pathLst>
          </a:custGeom>
          <a:gradFill rotWithShape="1">
            <a:gsLst>
              <a:gs pos="0">
                <a:srgbClr val="3498DB"/>
              </a:gs>
              <a:gs pos="100000">
                <a:srgbClr val="2980B9"/>
              </a:gs>
            </a:gsLst>
            <a:lin ang="0" scaled="1"/>
          </a:gradFill>
        </p:spPr>
      </p:sp>
      
      <!-- 标题文本框 - 居中且更大字体 -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="title"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="609600" y="800000"/>
            <a:ext cx="10972800" cy="1600000"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="zh-CN" sz="4400" b="1">
                <a:solidFill>
                  <a:srgbClr val="2C3E50"/>
                </a:solidFill>
                <a:latin typeface="Microsoft YaHei"/>
                <a:ea typeface="Microsoft YaHei"/>
              </a:rPr>
              <a:t>$title</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      
      <!-- 内容文本框 - 更好的排版 -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Content"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="body"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="609600" y="2800000"/>
            <a:ext cx="10972800" cy="3400000"/>
          </a:xfrm>
          <a:solidFill>
            <a:srgbClr val="FFFFFF"/>
          </a:solidFill>
          <a:ln w="12700">
            <a:solidFill>
              <a:srgbClr val="E5E7EB"/>
            </a:solidFill>
          </a:ln>
          <a:effectLst>
            <a:outerShdw blurRad="50000" dist="25000" dir="5400000">
              <a:srgbClr val="000000">
                <a:alpha val="15000"/>
              </a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
        </p:spPr>
        <p:txBody>
          <a:bodyPr lIns="200000" tIns="200000" rIns="200000" bIns="200000"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr marL="0" indent="0"/>
            <a:r>
              <a:rPr lang="zh-CN" sz="2400">
                <a:solidFill>
                  <a:srgbClr val="4A5568"/>
                </a:solidFill>
                <a:latin typeface="Microsoft YaHei"/>
                <a:ea typeface="Microsoft YaHei"/>
              </a:rPr>
              <a:t>$content</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
 </p:sld>''';
    return utf8.encode(xml);
  }
  
  // 提取要点文本
  static String _extractBulletPointsText(String text) {
    if (text.isEmpty) return '暂无内容';
    
    final cleanText = _cleanMarkdownText(text);
    final sentences = cleanText.split(RegExp(r'[。；\n]'))
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty && s.length > 3)
        .take(5) // 最多5个要点
        .toList();
    
    return sentences.join(' ');
  }
  
  // 清理Markdown格式文本
  static String _cleanMarkdownText(String text) {
    if (text.isEmpty) return text;
    
    return text
        .replaceAll(RegExp(r'\*\*(.*?)\*\*'), r'$1')
        .replaceAll(RegExp(r'\*(.*?)\*'), r'$1')
        .replaceAll(RegExp(r'```.*?```', dotAll: true), '')
        .replaceAll(RegExp(r'`([^`]+)`'), r'$1')
        .replaceAll(RegExp(r'\[([^\]]+)\]\([^\)]+\)'), r'$1')
        .replaceAll(RegExp(r'^#{1,6}\s+', multiLine: true), '')
        .replaceAll(RegExp(r'^\s*[-*+]\s+', multiLine: true), '')
        .replaceAll(RegExp(r'^\s*\d+\.\s+', multiLine: true), '')
        .replaceAll(RegExp(r'^\s*>\s+', multiLine: true), '')
        // 移除特殊字符如 $1, $2 等
        .replaceAll(RegExp(r'\$\d+'), '')
        .replaceAll(RegExp(r'\n\s*\n'), '\n')
        .trim();
  }
  
  // 其他必需的XML文件
  static List<int> _getSlideRelsXml(int slideNumber) {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getSlideLayoutXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="Title and Content">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getTitleSlideLayoutXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="Title Slide">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getSlideMasterXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
</p:sldMaster>''';
    return utf8.encode(xml);
  }
  
  static List<int> _getProfessionalThemeXml() {
    const xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="ModernEducation">
  <a:themeElements>
    <a:clrScheme name="ModernEducation">
      <a:dk1>
        <a:srgbClr val="2C3E50"/>
      </a:dk1>
      <a:lt1>
        <a:srgbClr val="FFFFFF"/>
      </a:lt1>
      <a:dk2>
        <a:srgbClr val="34495E"/>
      </a:dk2>
      <a:lt2>
        <a:srgbClr val="F8F9FA"/>
      </a:lt2>
      <a:accent1>
        <a:srgbClr val="3498DB"/>
      </a:accent1>
      <a:accent2>
        <a:srgbClr val="27AE60"/>
      </a:accent2>
      <a:accent3>
        <a:srgbClr val="E74C3C"/>
      </a:accent3>
      <a:accent4>
        <a:srgbClr val="F39C12"/>
      </a:accent4>
      <a:accent5>
        <a:srgbClr val="9B59B6"/>
      </a:accent5>
      <a:accent6>
        <a:srgbClr val="1ABC9C"/>
      </a:accent6>
      <a:hlink>
        <a:srgbClr val="2980B9"/>
      </a:hlink>
      <a:folHlink>
        <a:srgbClr val="8E44AD"/>
      </a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="ModernEducation">
      <a:majorFont>
        <a:latin typeface="Segoe UI Light"/>
        <a:ea typeface="Microsoft YaHei Light"/>
        <a:cs typeface="Arial Unicode MS"/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Segoe UI"/>
        <a:ea typeface="Microsoft YaHei"/>
        <a:cs typeface="Arial Unicode MS"/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="ModernEducation">
      <a:fillStyleLst>
        <a:solidFill>
          <a:schemeClr val="phClr"/>
        </a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0">
              <a:schemeClr val="phClr">
                <a:tint val="80000"/>
                <a:satMod val="200000"/>
              </a:schemeClr>
            </a:gs>
            <a:gs pos="50000">
              <a:schemeClr val="phClr">
                <a:tint val="60000"/>
                <a:satMod val="200000"/>
              </a:schemeClr>
            </a:gs>
            <a:gs pos="100000">
              <a:schemeClr val="phClr">
                <a:tint val="40000"/>
                <a:satMod val="200000"/>
              </a:schemeClr>
            </a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="1"/>
        </a:gradFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0">
              <a:schemeClr val="phClr">
                <a:shade val="80000"/>
                <a:satMod val="120000"/>
              </a:schemeClr>
            </a:gs>
            <a:gs pos="100000">
              <a:schemeClr val="phClr">
                <a:shade val="60000"/>
                <a:satMod val="120000"/>
              </a:schemeClr>
            </a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="0"/>
        </a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="12700" cap="flat" cmpd="sng" algn="ctr">
          <a:solidFill>
            <a:schemeClr val="phClr">
              <a:shade val="90000"/>
              <a:satMod val="110000"/>
            </a:schemeClr>
          </a:solidFill>
          <a:prstDash val="solid"/>
        </a:ln>
        <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr">
          <a:solidFill>
            <a:schemeClr val="phClr">
              <a:shade val="85000"/>
            </a:schemeClr>
          </a:solidFill>
          <a:prstDash val="solid"/>
        </a:ln>
        <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr">
          <a:solidFill>
            <a:schemeClr val="phClr">
              <a:shade val="80000"/>
            </a:schemeClr>
          </a:solidFill>
          <a:prstDash val="solid"/>
        </a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle>
          <a:effectLst>
            <a:outerShdw blurRad="60000" dist="30000" dir="5400000" rotWithShape="0">
              <a:srgbClr val="000000">
                <a:alpha val="25000"/>
              </a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
        </a:effectStyle>
        <a:effectStyle>
          <a:effectLst>
            <a:outerShdw blurRad="80000" dist="40000" dir="5400000" rotWithShape="0">
              <a:srgbClr val="000000">
                <a:alpha val="30000"/>
              </a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
        </a:effectStyle>
        <a:effectStyle>
          <a:effectLst>
            <a:outerShdw blurRad="100000" dist="50000" dir="5400000" rotWithShape="0">
              <a:srgbClr val="000000">
                <a:alpha val="35000"/>
              </a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
        </a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill>
          <a:schemeClr val="phClr"/>
        </a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0">
              <a:schemeClr val="phClr">
                <a:tint val="90000"/>
                <a:satMod val="150000"/>
              </a:schemeClr>
            </a:gs>
            <a:gs pos="50000">
              <a:schemeClr val="phClr">
                <a:tint val="70000"/>
                <a:satMod val="150000"/>
              </a:schemeClr>
            </a:gs>
            <a:gs pos="100000">
              <a:schemeClr val="phClr">
                <a:tint val="50000"/>
                <a:satMod val="200000"/>
              </a:schemeClr>
            </a:gs>
          </a:gsLst>
          <a:path path="circle">
            <a:fillToRect l="50000" t="50000" r="50000" b="50000"/>
          </a:path>
        </a:gradFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0">
              <a:schemeClr val="phClr">
                <a:tint val="95000"/>
                <a:satMod val="120000"/>
              </a:schemeClr>
            </a:gs>
            <a:gs pos="100000">
              <a:schemeClr val="phClr">
                <a:shade val="40000"/>
                <a:satMod val="180000"/>
              </a:schemeClr>
            </a:gs>
          </a:gsLst>
          <a:path path="circle">
            <a:fillToRect l="50000" t="20000" r="50000" b="80000"/>
          </a:path>
        </a:gradFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>''';
    return utf8.encode(xml);
  }
} 