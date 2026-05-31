import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class VnPayService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Hàm tạo đường link thanh toán sang VNPay Sandbox
   * @param referenceId Mã giao dịch của hệ thống (Ví dụ: Contract ID)
   * @param amount Số tiền cần thanh toán
   * @param ipAddr Địa chỉ IP của client gửi request
   * @param bankCode Mã ngân hàng muốn chỉ định thanh toán (Không bắt buộc, ví dụ: 'NCB')
   */
  createPaymentUrl(
    referenceId: string,
    amount: number,
    ipAddr: string,
    bankCode?: string, // Thêm tham số tùy chọn để chỉ định ngân hàng
  ): string {
    const tmnCode = this.configService.get<string>('VNP_TMN_CODE') || '';
    const secretKey = this.configService.get<string>('VNP_HASH_SECRET') || '';
    let vnpUrl = this.configService.get<string>('VNP_URL') || '';
    const returnUrl = this.configService.get<string>('VNP_RETURN_URL') || '';

    const date = new Date();
    const createDate =
      date.getFullYear().toString() +
      ('0' + (date.getMonth() + 1)).slice(-2) +
      ('0' + date.getDate()).slice(-2) +
      ('0' + date.getHours()).slice(-2) +
      ('0' + date.getMinutes()).slice(-2) +
      ('0' + date.getSeconds()).slice(-2);

    let vnp_Params: Record<string, string> = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = referenceId;
    vnp_Params['vnp_OrderInfo'] = `Thanh toan don hang ${referenceId}`;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = (amount * 100).toString();
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;

    // Nếu người dùng truyền cụ thể ngân hàng (ví dụ: 'NCB'), ta thêm vào param gửi đi
    if (bankCode && bankCode.trim() !== '') {
      vnp_Params['vnp_BankCode'] = bankCode;
    }
    // vnp_Params['vnp_BankCode'] = 'NCB';

    vnp_Params = this.sortObject(vnp_Params);

    const signData = new URLSearchParams(vnp_Params).toString();
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnp_Params['vnp_SecureHash'] = signed;

    vnpUrl += '?' + new URLSearchParams(vnp_Params).toString();

    return vnpUrl;
  }

  /**
   * Hàm xác thực chữ ký trả về từ VNPay
   */
  verifyCallback(vnp_Params: Record<string, string>): {
    isValid: boolean;
    txnRef: string;
    responseCode: string;
  } {
    const secretKey = this.configService.get<string>('VNP_HASH_SECRET') || '';
    const secureHash = vnp_Params['vnp_SecureHash'] || '';

    const paramsCopy = { ...vnp_Params };
    delete paramsCopy['vnp_SecureHash'];
    delete paramsCopy['vnp_SecureHashType'];

    const sortedParams = this.sortObject(paramsCopy);
    const signData = new URLSearchParams(sortedParams).toString();
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return {
      isValid: secureHash === signed,
      txnRef: vnp_Params['vnp_TxnRef'] || '',
      responseCode: vnp_Params['vnp_ResponseCode'] || '',
    };
  }

  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();
    for (let i = 0; i < keys.length; i++) {
      sorted[keys[i]] = obj[keys[i]];
    }
    return sorted;
  }
}
