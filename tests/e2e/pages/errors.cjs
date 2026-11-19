// Error reports: with reporting turned on for the test (stand-in function, nothing real is sent),
// an uncaught error on a game page sends its page and first line once; repeats are not resent.
module.exports = async ({ page, B }) => {
  const sent = []
  await page.context().route('**/rest/v1/rpc/log_error', async (r) => { sent.push(JSON.parse(r.request().postData())); await r.fulfill({ status: 204, body: '' }) })
  await page.context().addInitScript(() => localStorage.setItem('qg:error-test', 'true'))
  await page.goto(B + '/rule-stack/')
  await page.locator('.rs-grid').waitFor()
  await page.evaluate(() => { for (let i = 0; i < 3; i++) setTimeout(() => { throw new Error('e2e test error\nwith a stack line') }, 0) })
  await page.waitForTimeout(800)
  if (sent.length !== 1) throw new Error('expected one report, got ' + JSON.stringify(sent))
  if (sent[0].p_page !== 'rule-stack' || !/e2e test error$/.test(sent[0].p_message)) throw new Error('bad report: ' + JSON.stringify(sent[0]))
}
