const TeleBot = require('telebot');
const fetch = require('node-fetch');
const bot = new TeleBot({
    token: '',
    usePlugins: ['namedButtons'],
    pluginConfig: {
		namedButtons: {
			buttons: {
        templates: {
          label: 'Поиск по шаблону',
					command: '/templates'
        },
        search: {
          label: 'Поиск по ключевым словам',
					command: '/search'
        },
        yes: {
          label: 'Да',
					command: '/presave'
        },
        no: {
          label: 'Нет',
					command: '/repeat'
        },
        save: {
          label: 'Сохранить',
					command: '/save'
        },
        end: {
          label: 'Закончить',
					command: '/end'
        },
        repeat: {
          label: 'Повторить',
          command: '/search'
        }
			}
		}
	}
});

const searchUrl = 'http://81.2.243.228:9200/articles/_search';
const getUrl = 'http://localhost:8080/article/';
const templateUrl = 'http://localhost:8080/template/';
const allTemplatesUrl = 'http://localhost:8080/templates/';
const userId = 0;

let flag = 0;
let lastSearch = '';

function fetchArticle(url, key) {
  console.log('fetching: '+url+key); // debug
  return fetch(url, {
    method: 'post',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "from" : 0,
      "size" : 10,
      "query": {
        "match" : {
          "content": key
        }
      }
    })
  })
    .then(handleErrors)
    .then(response => response.json()) //.json
    .then(data => {
      console.log(data.hits.total);
      if (data.hits.total > 0) {
        return data.hits.hits;
      } else {
        return 'undefined';
      }

    }) //data.data
    .catch(error => console.log(error) );
}

function fetchTemplate(url, key, userId) {
  console.log('fetching: '+url+key+'?user='+userId); // debug
  return fetch(url+key+'?user='+userId)
    .then(handleErrors)
    .then(response => response.json())
    .then(data => data.data)
    .then(res => fetchArticle(searchUrl, res.content))
    .catch(error => console.log(error) );
}

function saveTemplate(url, userId, name, query, msg) {
  flag = 0;
  console.log('saving:'+name+query)
  console.log('msg:'+msg)
  return fetch(url, {
    method: 'post',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        "id_user": userId,
        "name": name,
        "content": query
    })
  })
    .then(handleErrors)
    .then(res=>res.json())
    .then(res=>console.log('success'))
    .then(bot.event('/end', msg))
    .catch(error => console.log(error) );
    //.then(res => msg.reply.text('Шаблон успешно сохранён')); // добавить проверку успешного сохранения
}

function DelayPromise(delay) {
  return function(data) {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        resolve(data);
      }, delay);
    });
  }
}

function returnText(res,msg) {
  lastSearch = msg.text;
  console.log('the result is:'+(res));
  if (res === 'undefined') {
    return msg.reply.text('Ничего не найдено. Попробуйте ещё раз').then(DelayPromise(1000)).then(bot.event('/search', msg));
  } else {
    return Promise.all(res.map((el) => msg.reply.text(el._source.content))).then(DelayPromise(1000)).then(res => bot.event('/result',msg));
  }
}

function flagChange(num) {
  flag = num;
  console.log('flag changed to: '+flag);
}
// error handling
function handleErrors(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
}

// начало
bot.on(['/start'], msg => {
  console.log('flag: '+flag);
  flag = 0;
  let replyMarkup = bot.keyboard([
        ['Поиск по шаблону', 'Поиск по ключевым словам']
    ], {resize: true});
    return bot.sendMessage(msg.from.id, 'Привет! выберите желаемый способ поиска с помощью клавиш внизу:', {replyMarkup});
});
bot.on(['/search'], msg => {
    flag = 1;
    msg.text = '/';
    return bot.sendMessage(
        msg.from.id, 'Введите запрос', {replyMarkup: 'hide'}
    );

});
bot.on(['/templates'], msg => {
    flag = 2;
    msg.text = '/';
    return bot.sendMessage(
        msg.from.id, 'Введите название шаблона', {replyMarkup: 'hide'}
    );
});

bot.on(['/result'], msg => {
    flag = 0;
    let replyMarkup = bot.keyboard([
        ['Да', 'Нет']
    ], {resize: true});
    return bot.sendMessage(
        msg.from.id, 'Удовлетворяют ли вас результаты поиска?', {replyMarkup}
    );
})

bot.on(['/presave'], msg => {
    flag = 0;
    let replyMarkup = bot.keyboard([
        ['/save', 'Закончить']
    ], {resize: true});
    return bot.sendMessage(
        msg.from.id, 'Если хотите сохранить поиск как шаблон, нажмите /save. Или нажмите кнопку /end', {replyMarkup}
    );
})

bot.on(['/repeat'], msg => {
    flag = 0;
    let replyMarkup = bot.keyboard([
        ['Повторить', 'Закончить']
    ], {resize: true});
    return bot.sendMessage(
        msg.from.id, 'Повторить поиск?', {replyMarkup}
    );
})

bot.on(['/save'], msg => {
    flag = 3;
    return bot.sendMessage(
        msg.from.id, 'Введите название нового шаблона для поискового запроса '+lastSearch, {replyMarkup: 'hide'}
    );
});

bot.on(['/end'], msg => {
    return bot.sendMessage(
        msg.from.id, 'Спасибо за использование сервиса!', {replyMarkup: 'hide'}
    );
});

bot.on(['text'], msg => {
  console.log(`[text] ${ msg.chat.id } ${ msg.text }`); // logging
  if (msg.text[0] != '/') {
    switch (flag) {
      case 1:
        return fetchArticle(searchUrl, msg.text)
          .then(res => returnText(res,msg))
        break;
      case 2:
        return fetchTemplate(templateUrl, msg.text, userId)
          .then(res => returnText(res,msg))
        break;
      case 3:
        saveTemplate(templateUrl, userId, msg.text, lastSearch, msg);
        break;
      case 0:
      default:
        return;
    }
  }
});

// On inline query
bot.on('inlineQuery', msg => {

    let query = msg.query;
    console.log(`inline query: ${ query }`);

    // Create a new answer list object
    const answers = bot.answerList(msg.id, {cacheTime: 60});
    let result = '';

    fetchTemplate(templateUrl, query, userId)
      .then(res => res.map((el) => answers.addArticle({
        id: el._source.id,
        title: 'Search in texts using your template',
        description: `Source: ${ el._source.id }`,
        message_text: el._source.content
      })))
      .then(res => {return bot.answerQuery(answers)})
      .then(res => {if(res.length > 0) {(console.log(answers))}})


});

bot.connect();

module.exports = fetchArticle
