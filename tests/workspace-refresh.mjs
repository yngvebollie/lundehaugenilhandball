import assert from 'node:assert/strict';
import {temporaryReadFailure} from '../src/lib/workspace-refresh.ts';
for(const e of [new TypeError('Failed to fetch'),{message:'TypeError: NetworkError when attempting to fetch resource.'},{message:'Load failed'},{status:503},{status:429},{name:'AuthRetryableFetchError'},{name:'TimeoutError'}])assert.equal(temporaryReadFailure(e),true,JSON.stringify(e));
for(const e of [null,{},new Error('Invalid configuration'),{status:401,message:'Failed to fetch'},{status:403},{code:'42501'},{code:'PGRST301'},{code:'PGRST302'},new Error('Finish joining your team using the team directory.')])assert.equal(temporaryReadFailure(e),false,JSON.stringify(e));
console.log('PASS: only temporary transport/service errors retain mounted drafts; access/configuration failures do not');
