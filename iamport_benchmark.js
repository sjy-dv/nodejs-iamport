const Iamport = require('./iamport');
const Benchmark = require('benchmark');
const config = require('./config');

const iamport = new Iamport(config.impKey, config.impSecret);

const suite = new Benchmark.Suite();

suite
    .add('결제내역 조회 밴치마크', {
        defer: true,
        fn: deferred => {
            const impUid = config.impUid;

            iamport.lookupPayment(impUid)
                .then(() => {
                    deferred.resolve();
                })
                .catch(error => {
                    deferred.reject(error);
                });
        }
    })
    .on('cycle', event => {
        console.log(String(event.target));
    })
    .on('complete', () => {
        console.log("Benchmark Finished");
    })
    .run({ async: true });