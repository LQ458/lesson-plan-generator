// 条件导入OCR服务
// 根据平台选择合适的OCR实现
 
export 'ocr_service_stub.dart'
    if (dart.library.io) 'enhanced_ocr_service.dart'; 