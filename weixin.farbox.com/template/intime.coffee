Post = (raw_post) ->
    @id = raw_post.path
    @title = ko.observable(raw_post.title)
    @content = ko.observable(raw_post.content)
    return this


PageModel = (raw_posts) ->
    @posts = ko.observableArray()
    @ids = ko.observableArray()
    for raw_post in raw_posts
        post = new Post(raw_post)
        @posts.push(post)
        @ids.push(post.id)

    @update_post = (note) =>
        if note.doc_type == 'post'
            post_id = note.path
            for post in  @posts()
                if post.id == post_id
                    $.getJSON '/?path='+note.path+"&v="+Math.random(), {}, (raw_post) =>
                        if not raw_post.error
                            content = raw_post.content
                            content = content.replace(/<img /g, "<img onerror=\"var im=this;setTimeout(function(){im.src = im.src}, 1000)\" ")
                            post.title(raw_post.title)
                            post.content(content)
                    break
    return this

@render_page = (raw_posts) =>
    @page_model = new PageModel(raw_posts)
    ko.applyBindings(@page_model)


if WebSocket? and JSON?
    if document.location.protocol == 'https:' then ws_protocl='wss:' else ws_protocl='ws:'
    ws_url = ws_protocl+'realtime.farbox.com/notes'
    socket = null
    connect_to_farbox = =>
        socket = new WebSocket(ws_url)
        connectted_at = new Date()
        socket.onmessage = (message)=>
            note = JSON.parse(message.data)
            @page_model.update_post(note)
        socket.onclose = ->
            if (new Date() - connectted_at)/1000 > 10
                connect_to_farbox() #reconnect
    keep_live = =>
        if socket
            socket.send('ping')
    # first time call
    connect_to_farbox()
    setInterval(keep_live, 30000)