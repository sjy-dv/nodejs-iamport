const axios = require('axios');
const util = require('util');

// this api support method
const _iamport_get_token_endpoint = "https://api.iamport.kr/users/getToken";
const _iamport_payment_lookup_endpoint = "https://api.iamport.kr/payments/%s";
const _iamport_cancel_endpoint = "https://api.iamport.kr/payments/cancel";
const _iamport_account_confirm_endpoint = "https://api.iamport.kr/vbanks/holder?bank_code=%s&bank_num=%s";

// error message
const _unauthorization_token = "Token issuance failed, check the import key and private key."
const _iamport_network_error = "import network error";
const _iamport_token_unauthorized = "Validity of issued token is invalid"
const _not_found_imp_uid = "The requested imp_uid could not be found. Check imp_uid."
const _not_confirm_payment = "Payment not confirmed in the import server";
// iamport class definition
// - kor : 아임포트 class 선언
class Iamport {
    constructor(impKey, impSecret) {
        this.impKey = impKey;
        this.impSecret = impSecret;
    }

    //private method 
    // - kor : 비공개 함수
    async _getToken() {
        let rjson = {
            code: 0,
            message: '',
            error_message: '',
            response: {
                accessToken: '',
                expiredAt: 0,
                now: 0,
            }
        }
        try {
            const retval = await axios.post(_iamport_get_token_endpoint, {
                imp_key: this.impKey,
                imp_secret: this.impSecret,
            });
            if (retval.data.code != 0) {
                rjson.code = 1;
                rjson.error_message = _unauthorization_token;
                return rjson;
            }
            rjson.response.accessToken = retval.data.response.access_token;
            return rjson;
        } catch (error) {
            // The success code for iamport is 0.
            // - kor : 아임포트의 성공 코드는 0입니다.
            rjson.code = 1;
            rjson.error_message = error.toString();
            return rjson;
        }
    }

    _form(ops) {
        const vals = {};

        if (ops.Amount) {
            vals.amount = ops.Amount;
        }

        if (ops.Reason) {
            vals.reason = ops.Reason;
        }

        if (ops.RefundHolder) {
            vals.refund_holder = ops.RefundHolder;
        }

        if (ops.RefundBank) {
            vals.refund_bank = ops.RefundBank.toString();
        }

        if (ops.RefundAccount) {
            vals.refund_account = ops.RefundAccount;
        }

        return vals;
    }

    //public method
    // - kor : 공개 함수
    async lookupPayment(impUid) {
        let reply = {
            //iamport status
            status: false,
            // iamport response status
            ok: false,
            //iamport paid amount
            amount: 0,
            error: '',
            //Just a guess, don't trust it 100%
            // - kor 통상적인 추론, 100%신뢰금지
            error_guess: '',
        }
        try {
            const auth = await this._getToken();
            if (auth.code == 1) {
                reply.error = auth.error_message;
                reply.error_guess = _unauthorization_token;
                return reply
            }
            const retval = await axios.post(
                util.format(_iamport_payment_lookup_endpoint, impUid), {}, {
                headers: {
                    'Authorization': auth.response.accessToken
                }
            });
            if (retval.status == 401) {
                reply.error = "iamport unauthorized";
                reply.error_guess = _iamport_token_unauthorized;
                return reply;
            }
            if (retval.status == 404) {
                reply.error = "iamport invalid imp_uid";
                reply.error_guess = _not_found_imp_uid;
                return reply;
            }
            if (retval.status != 200) {
                reply.error = "unknown error";
                reply.error_guess = _iamport_network_error;
                return reply;
            }
            if (retval.data.code != 0) {
                reply.error = util.format("response: %s\nmessage: %s", retval.data.response, retval.data.message);
                reply.error_guess = "iamport response error";
                return reply;
            }
            if (retval.data.response.status != "paid") {
                reply.error = util.format("imp_uid : %s , paid fail", impUid);
                reply.error_guess = _not_confirm_payment;
                return reply;
            }
            reply.error = null;
            reply.error_guess = null;
            reply.status = true;
            reply.ok = true;
            reply.amount = retval.data.response.amount;
            return reply;
        } catch (error) {
            reply.error = error.toString();
            reply.error_guess = _iamport_network_error;
            return reply;
        }
    }

    /*example options
     refund_holder, refund_banck, refund_account -> This is generally not used if it is only for virtual accounts.
    - kor : refund_holder, refund_banck, refund_account -> 가상계좌용 옵션이기때문에 일반적으로 사용되지 않습니다.
    {
        amount string -> refund price
        reason string -> refund reason
        refund_holder string
        refund_banck string
        refund_account string
    }
    */
    async cancelPayment(impUid, opts) {
        let reply = {
            //iamport status
            status: false,
            // iamport response status
            ok: false,
            //iamport response
            response: '',
            error: '',
            //Just a guess, don't trust it 100%
            // - kor 통상적인 추론, 100%신뢰금지
            error_guess: '',
        }
        const auth = await this._getToken();
        if (auth.code == 1) {
            reply.error = auth.error_message;
            reply.error_guess = _unauthorization_token;
            return reply
        }
        opts.imp_uid = impUid;
        try {
            const response = await axios.post(_iamport_cancel_endpoint, opts, {
                headers: {
                    Authorization: auth.response.accessToken,
                }
            });
            if (response.status == 401) {
                reply.error = "iamport unauthorized";
                reply.error_guess = _iamport_token_unauthorized;
                return reply;
            }
            if (response.status != 200) {
                reply.error = "unknown error";
                reply.error_guess = _iamport_network_error;
                return reply;
            }
            if (response.data.code != 0) {
                reply.error = util.format("response: %s\nmessage: %s", retval.data.response, retval.data.message);
                reply.error_guess = "iamport response error";
                return reply;
            }
            reply.error = null;
            reply.error_guess = null;
            reply.status = true;
            reply.ok = true;
            reply.response = response.data.response;
            return reply;
        } catch (error) {
            reply.error = error.toString();
            reply.error_guess = _iamport_network_error;
            return reply;
        }
    }

    async accountConfirm(bankCode, bankAccount) {
        let reply = {
            message: "",
            bank_holder: "",
            error: '',
            //Just a guess, don't trust it 100%
            // - kor 통상적인 추론, 100%신뢰금지
            error_guess: '',
        };
        const auth = await this._getToken();
        if (auth.code == 1) {
            reply.error = auth.error_message;
            reply.error_guess = _unauthorization_token;
            return reply
        }
        try {
            const response = await axios.get(util.format(_iamport_account_confirm_endpoint, bankCode, bankAccount), {
                headers: {
                    "Authorization": auth.response.accessToken,
                },
            });
            if (response.status == 401) {
                reply.error = "iamport unauthorized";
                reply.error_guess = _iamport_token_unauthorized;
                return reply;
            }
            if (response.status != 200) {
                reply.error = "unknown error";
                reply.error_guess = _iamport_network_error;
                return reply;
            }
            if (response.data.message == "해당되는 계좌정보를 찾을 수 없습니다.") {
                reply.message = response.data.message;
                reply.error = null;
                reply.error_guess = null;
                reply.bank_holder = "unknown";
                return reply;
            }
            reply.message = "success";
            reply.error = null;
            reply.error_guess = null;
            reply.bank_holder = response.data.response.bank_holder;
            return reply;
        } catch (error) {
            reply.error = error.toString();
            reply.error_guess = _iamport_network_error;
            return reply;
        }
    }

    bankCode = (bank) => {
        const bankCode = {
            "KB국민은행": "004",
            "SC제일은행": "023",
            "경남은행": "039",
            "광주은행": "034",
            "기업은행": "003",
            "농협": "011",
            "대구은행": "031",
            "부산은행": "032",
            "산업은행": "002",
            "수협": "007",
            "신한은행": "088",
            "신협": "048",
            "외환은행": "005",
            "우리은행": "020",
            "우체국": "071",
            "전북은행": "037",
            "제주은행": "035",
            "축협": "012",
            "하나은행(서울은행)": "081",
            "한국씨티은행(한미은행)": "027",
            "K뱅크": "089",
            "카카오뱅크": "090",
            "유안타증권": "209",
            "현대증권": "218",
            "미래에셋증권": "230",
            "대우증권": "238",
            "삼성증권": "240",
            "한국투자증권": "243",
            "우리투자증권": "247",
            "교보증권": "261",
            "하이투자증권": "262",
            "에이치엠씨투자증권": "263",
            "키움증권": "264",
            "이트레이드증권": "265",
            "에스케이증권": "266",
            "대신증권": "267",
            "솔로몬투자증권": "268",
            "한화증권": "269",
            "하나대투증권": "270",
            "굿모닝신한증권": "278",
            "동부증권": "279",
            "유진투자증권": "280",
            "메리츠증권": "287",
            "엔에이치투자증권": "289",
            "부국증권": "290"
        };
        return bankCode[bank];
    }
}


module.exports = Iamport;