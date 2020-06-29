
const { Telegraf } = require('telegraf')
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')

const fetch = require('node-fetch')
const LocalSession = require('telegraf-session-local')


var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('sqlite.db');


var token = '1343340370:AAGd7rKRurcmrUUBklF5JKBJuN0HVnhnOxw';
const bot = new Telegraf(token)
bot.use((new LocalSession({ database: 'example_db.json' })).middleware())

// bot.start((ctx) => ctx.reply('Custom buttons keyboard', Markup
//     .keyboard([
//         ['🔍 Search', '😎 Popular'], // Row1 with 2 buttons
//         ['☸ Setting', '📞 Feedback'], // Row2 with 2 buttons
//         ['📢 Ads', '⭐️ Rate us', '👥 Share'] // Row3 with 3 buttons
//     ])
//     .oneTime()
//     .resize()
//     .extra()
// ))

bot.start((ctx) => {
    ctx.reply('Привет! Для поиска похожих фильмов введите @similarmovies_bot потом название фильма'
        , Markup.keyboard([
            ['😎 Popular', '⭐️ Favorites'], // Row1 with 2 buttons
            // ['📞 Feedback'], // Row2 with 2 buttons
            // ['📢 Ads', ] // Row3 with 3 buttons
        ])
        .oneTime()
        .resize()
        .extra()
    )
    ctx.session.favorites = []
    // db.run(`DELETE FROM favourites WHERE uuid=?`, ctx.chat.id, function(err) {
    //     if (err) {
    //       return console.error(err.message);
    //     }
    //     console.log(`Row(s) deleted ${this.changes}`);
    //   }); 
})


bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on('sticker', (ctx) => ctx.reply('👍'))
bot.hears('hi', (ctx) => ctx.reply('Hey there'))


bot.hears('😎 Popular', ctx => {
    ctx.session.counterp = 1
    getPopular(1, ctx, true)
})

bot.hears('⭐️ Favorites', ctx => {
    db.all(`SELECT * FROM favourites where uuid=${ctx.chat.id}`, function(err, e){
        if (e && e.length>0){
            if (e.length > 15){
                const maxpagef = Math.round(e.length / 15)
            }
            else{
                var html = "Ваш список: \n"
                html += e.map(element => {
                    return `● <b>${element.title}</b>  (${element.date}) /f${element.id}`
                }).join('\n')
                ctx.replyWithHTML(html)
            }
        }else{
            const html = "У вас нет избранных фильмов"
            ctx.replyWithMarkdown(html)
        }
    })     
})


bot.on('message', (ctx) => {
    if (ctx.message.text.slice(0, 2) == "/f"){
        let a = ctx.message.text.slice(2)
        getDetail(a, ctx)
    }else{
        ctx.session.counter = 1
        ctx.session.title = ctx.message.text
        getSimilar(ctx.message.text, 1, ctx)
    }
})




bot.action(['next', 'prev'], ctx => {
    if (ctx.callbackQuery.data === 'next') {
        ctx.session.counter ++
        getSimilar2(ctx.session.title, ctx.session.counter, ctx)
    } 
    else {
        ctx.session.counter --
        getSimilar2(ctx.session.title, ctx.session.counter, ctx)
    }
})

bot.action(['nextp', 'prevp'], ctx => {
    if (ctx.callbackQuery.data === 'nextp') {
        ctx.session.counterp ++
        getPopular(ctx.session.counterp, ctx)
    } 
    else {
        ctx.session.counterp --
        getPopular(ctx.session.counterp, ctx)
    }
})

bot.action(['fav'], ctx => {
    console.log("fav")
    db.all(`SELECT * FROM favourites where uuid=${ctx.chat.id} and id=${ctx.session.newfavid}`, function(err, e){
        console.log(e)
        if (e && e.length>0){

        }else{
            db.run(`INSERT INTO favourites(uuid, id, title, date) VALUES(?, ?, ?, ?)`, [ctx.chat.id, ctx.session.newfavid, ctx.session.newfavtitle, ctx.session.newfavdate], function(err) {
                if (err) {
                return console.log(err.message);
                }
                console.log(`A row has been inserted with rowid ${this.lastID}`);
            });
        }
    })    
})



bot.on('inline_query', async ({ inlineQuery, answerInlineQuery }) => {
    const apiUrl = `https://api.themoviedb.org/3/search/movie?api_key=84e405af37cd3cba01b5109bc70e3baa&language=ru-RU&page=1&include_adult=false&query=${encodeURIComponent(inlineQuery.query)}`
    const response = await fetch(apiUrl)
    const { results } = await response.json()
    if (typeof(results) != 'undefined'){
        const recipes = results
            .filter(({ poster_path }) => poster_path)
            .map(({ id, title, poster_path }) => ({
                type: 'article',
                id: id,
                title: title,
                description: title,
                thumb_url: "https://image.tmdb.org/t/p/w220_and_h330_face" + poster_path,
                input_message_content: {
                    message_text: id
                }
            }))
            return answerInlineQuery(recipes)
    }
})





function getSimilar(id, page, ctx){
    const apiUrl = `https://api.themoviedb.org/3/movie/${id}/similar?api_key=84e405af37cd3cba01b5109bc70e3baa&language=ru-RU&page=${page}`
    fetch(apiUrl).then(r=>{
        return r.json()
    })
    .then(r=>{
        if (typeof(r.results) != "undefined"){
            const html = r.results.map(element => {
                return `● <b>${element.title}</b>  (${element.release_date}) /f${element.id}`
            }).join('\n')        
            ctx.replyWithHTML(html, Markup.inlineKeyboard([
                Markup.callbackButton("Next", "next")
            ], {column: 2}).extra())
            ctx.session.maxPage = r.total_pages
        }
        else{
            const html = '<b>Not found</b>'
            ctx.replyWithHTML(html)
        }
        
    })
}


function getSimilar2(id, page, ctx){
    const apiUrl = `https://api.themoviedb.org/3/movie/${id}/similar?api_key=84e405af37cd3cba01b5109bc70e3baa&language=ru-RU&page=${page}`
    fetch(apiUrl).then(r=>{
        return r.json()
    })
    .then(r=>{
        if (typeof(r.results) != "undefined"){
            const html = r.results.map(element => {
                return `● <b>${element.title}</b>  (${element.release_date})`
            }).join('\n')
            if (page == 1) {
                ctx.editMessageText(html, Extra.HTML().markup(m => m.inlineKeyboard([
                    m.callbackButton('Next', 'next'),
                ])))
            }
            else if (page == ctx.session.maxPage){
                ctx.editMessageText(html, Extra.HTML().markup(m => m.inlineKeyboard([
                    m.callbackButton('Prev', 'prev'),
                ])))
            }
            else {
                ctx.editMessageText(html, Extra.HTML().markup(m => m.inlineKeyboard([
                    m.callbackButton('Prev', 'prev'),
                    m.callbackButton('Next', 'next')
                ])))
            }         
        }
        else{
            const html = '<b>Not found</b>'
            ctx.replyWithHTML(html)
        }
        
    })
}


function getPopular(page, ctx, rp=false){
    const apiUrl = `https://api.themoviedb.org/3/movie/popular?api_key=84e405af37cd3cba01b5109bc70e3baa&language=ru-RU&page=${page}`
    fetch(apiUrl).then(r=>{
        return r.json()
    })
    .then(r=>{
        if (typeof(r.results) != "undefined"){
            const html = r.results.map(element => {
                return `● <b>${element.title}</b>  (${element.release_date}) /f${element.id}`
            }).join('\n')
            if (rp){
                ctx.replyWithHTML(html, Markup.inlineKeyboard([
                    Markup.callbackButton("Next", "nextp")
                ], {column: 2}).extra())
            } else{
                if (page == 1) {
                    ctx.editMessageText(html, Extra.HTML().markup(m => m.inlineKeyboard([
                        m.callbackButton('Next', 'nextp'),
                    ])))
                }
                else if (page == ctx.session.maxPage){
                    ctx.editMessageText(html, Extra.HTML().markup(m => m.inlineKeyboard([
                        m.callbackButton('Prev', 'prevp'),
                    ])))
                }
                else {
                    ctx.editMessageText(html, Extra.HTML().markup(m => m.inlineKeyboard([
                        m.callbackButton('Prev', 'prevp'),
                        m.callbackButton('Next', 'nextp')
                    ])))
                }       
            }
        }
        else{
            const html = '<b>Not found</b>'
            ctx.replyWithHTML(html)
        }
    })
}


function getDetail(id, ctx){
    const apiUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=84e405af37cd3cba01b5109bc70e3baa&language=ru-RU`
    fetch(apiUrl).then(r=>{
        return r.json()
    })
    .then(r=>{
        if (typeof(r) != "undefined"){
            let genre = ""
            for (let i in r.genres){
                genre += r.genres[i].name + " "
            }
            const html = `
🔥🎥 **${r.title}** (${r.release_date}, ${r.production_countries[0].iso_3166_1})
${genre}
⭐️ ${r.vote_average}
⏳ ${r.runtime} мин
📄 ${r.overview}
![poster](https://image.tmdb.org/t/p/w440_and_h660_face${r.poster_path})
                `
            ctx.session.newfavtitle = r.title
            ctx.session.newfavid = r.id
            ctx.session.newfavdate = r.release_date

            ctx.replyWithMarkdown(
                html, Markup.inlineKeyboard([
                    Markup.callbackButton("add to favorites", "fav")
                ]).extra()
            )
        }
        else{
            const html = '<b>Not found</b>'
            ctx.replyWithHTML(html)
        }
    })
}


const PORT = process.env.PORT || 3000;
const URL = process.env.URL || 'https://searchmoviesbot.herokuapp.com';

bot.telegram.setWebhook(`${URL}/bot${token}`);
bot.startWebhook(`/bot${token}`, null, PORT)

bot.launch()