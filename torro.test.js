const fetchArticle = require('./torro');
const searchUrl = 'http://localhost:8080/articles/search/';
const fetch = require('node-fetch');


it('fetchArticle logic OK', () => {
  const fakeFetch = jest.fn().mockReturnValue(Promise.resolve({
    json: () => Promise.resolve({
      data:
       [ { id: 2,
           content: 'Review code',
           status: 1,
           created_at: '2016-04-10T20:50:40.000Z' },
         { id: 4,
           content: 'RefActor Code',
           status: 1,
           created_at: '2016-04-10T20:50:40.000Z' } ],
      message: 'Articles search list.' })
  }))
  return fetchArticle(fakeFetch, searchUrl, 'code')
    .then(res => res.map((el) => expect(el.content).toMatch(/ode/)))
})



it('API works correctly', () => {
  return fetchArticle(fetch, searchUrl, 'Intel')
  .then(res => res.map((el) => expect(el._search.content).toMatch(/ntel/)))
})
