const Iamport = require('./iamport');
const config = require('./config');
const iamport = new Iamport(config.impKey, config.impSecret);

//조회 테스트
test('iamport에 결제내역이 있어야합니다. 없는 경우 테스트는 없어도 괜찮습니다.', async () => {

    const testImpUid = config.impUid;
    const result = await iamport.lookupPayment(testImpUid);
    expect(result).toEqual({
        status: true,
        ok: true,
        amount: 6900,
        error: null,
        error_guess: null,
    });
});

//결제 취소 테스트
test('결제 취소 테스트입니다. 취소할 결제 데이터가 존재해야합니다. 부분환불테스트 가능합니다.', async () => {
    const testImpUid = config.impUid;
    const result = await iamport.cancelPayment(testImpUid, {
        reason: "refund test",
        amount: 6900,
    });
    expect(result.ok).toEqual(true);
    expect(result.status).toEqual(true);
});
