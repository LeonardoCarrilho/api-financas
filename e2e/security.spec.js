import {test,expect} from "@playwright/test";
test("exige login e cria conta pelo servidor HTTP",async({request})=>{
 expect((await request.get("/api/accounts")).status()).toBe(401);
 const response=await request.post("/api/auth/register",{data:{name:"Pessoa E2E",email:"e2e@example.com",password:"test-only-password"}});
 expect(response.status()).toBe(201);
 const {data}=await response.json();
 const account=await request.post("/api/accounts",{headers:{Authorization:"Bearer "+data.token},data:{name:"Conta E2E"}});
 expect(account.status()).toBe(201);
});

