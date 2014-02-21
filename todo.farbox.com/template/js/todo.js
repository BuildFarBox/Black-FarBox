
var data_host = '/data';
var sync_gateway = '/service/gateway/sync';

var current_post_dom, controls;
var editor_model;
var c_hidden_left = -230;

var todoEditor = function(){
    var self=this;
    /*init*/
    $(document).ready(function(){
        $('#new-todo').keydown(function(event){
            if (event.keyCode == 13){
                self.new_todo();
            }
        });
    });

    this.editor = $('<input class="edit">'); /*input dom to edit to-do*/
    this.remover = $('<button class="destroy"></button>');
    this.swifter = $('<button class="toggle-todo"></button>');
    this.editor_block = false;


    this.touch = function(){
        $('#new-todo').focus();
        var list = $('.todo-list li');
        list.mouseenter(self.hover_li);
        list.dblclick(self.edit_todo);
    };


    /*对单个todo的hover处理*/
    this.hover_li = function(){
        self.remover.unbind();
        self.remover.click(self.remove_todo);
        self.swifter.unbind();
        self.swifter.click(self.toggle_todo);

        var dom = $(this);
        if (!dom.children('.destroy').length){
            dom.append(self.remover);
        }

        if (!dom.children('.toggle-todo').length){
            dom.append(self.swifter);
        }

    };

    this.edit_todo = function (){
        self.editor.unbind();
        self.editor.blur(self.edit_todo_finished);
        self.editor.keydown(function(event){
            if (event.keyCode == 13){
                self.editor.trigger('blur');
            }
        });
        var dom = $(this);
        if (!dom.hasClass('editing')){
            var todo_content = $.trim(dom.text());
            dom.append(self.editor);
            self.editor.val(todo_content);
            $('.todo-list li.editing').removeClass('editing');
            dom.addClass('editing');
            self.editor.focus();
        }
    };

    /*完成单条的编辑 to-sync*/
    this.edit_todo_finished = function(){
        $('.todo-list li.editing').removeClass('editing');
        var li_dom = self.editor.parent('li');
        if (!li_dom.length || self.editor_block){
            return false
        }
        self.editor_block = true;
        var todo_content = self.editor.val();
        if (li_dom.find('del').length){
            var content_dom = li_dom.find('del')
        }
        else{
            content_dom = li_dom
        }
        content_dom.text(todo_content);
        self.editor_block = false;
        editor_model.sync();
        return false
    };


    /*单条记录完成与否的切换 to-sync*/
    this.toggle_todo = function (){
        $('.todo-list li.editing').removeClass('editing');

        var li_dom = self.swifter.parent('li');
        if (!li_dom.length){
            return
        }
        if (li_dom.children('del').length){
            li_dom.html($.trim(li_dom.text()));
        }
        else{
            var del_dom = $('<del></del>').text($.trim(li_dom.text()));
            li_dom.text(' ');
            li_dom.append(del_dom);
        }

        self.hover_li.bind(li_dom)(); /*避免当前的状态消失*/

        editor_model.sync();

    };

    /* to-sync*/
    this.remove_todo = function(){
        var li_dom = self.remover.parent('li');
        if (!li_dom.length){
            return false
        }
        li_dom.remove();
        editor_model.sync();
        return false;

    };

    /*to sync*/
    this.new_todo = function(){
        var new_todo_dom = $('#new-todo');
        var todo_content = $.trim(new_todo_dom.val());
        if (todo_content){
            var new_li_dom = $('<li></li>').text(todo_content);
            var container = $('.todo-html');
            if (container.children('ul').length){
                container = $(container.children('ul')[0]);
            }
            new_li_dom.mouseenter(this.hover_li);
            new_li_dom.dblclick(this.edit_todo);
            container.append(new_li_dom);
            new_todo_dom.val('');
            editor_model.sync();
    }
}

};

var todo_editor = new todoEditor();




function to_markdown(value){
    if (value.indexOf('<ul>')){
        value = '<ul>' + value + '</ul>';
    }
    value = toMarkdown(value);
    value = value.replace(/<del>(.*?)<\/del>/g, '~~$1~~');
    value = value.replace(/<button .*>.*?<\/button>/g, '');
    return value
}



function get_today_str(){
    var now = new Date();
    var year = now.getFullYear().toString();
    var month = (now.getMonth()+1).toString();
    var day = now.getDate().toString();
    if (month.length == 1) month = '0'+month;
    if (day.length == 1) day = '0'+day;
    return year + '-' + month + '-' + day
}


function load_data(){
    var request_data = {};
    $.getJSON(data_host, request_data, function(posts){
        $.each(posts, function(i, post){
            editor_model.posts.push(new Post(post))
        });

        editor_model.init_editor();
    });
}



function show_controls(){
    if (controls.position().left == c_hidden_left){
        controls.animate({
            left: 0,
            opacity: 1
        }, 350, 'swing');
    }

}

function hide_controls(duration){
    if (controls.position().left == 0){
        controls.animate({
            left: c_hidden_left,
            opacity: 0.3
        }, duration||500, 'swing');
    }
}


var Post = function(raw_post){
    this.path = raw_post.path;
    this.title = raw_post.title;
    this.content = raw_post.content || '';

    this.edit = function(hide_controls_duration){

        var html_dom = $('.todo-list .todo-html');
        html_dom.html(this.content);
        todo_editor.touch();

        hide_controls(hide_controls_duration);

        if (current_post_dom){/*clear first*/
            current_post_dom.removeClass('current')
        }
        var index = $.inArray(this, editor_model.posts());
        current_post_dom = $($('#posts li a')[index]);
        current_post_dom.addClass('current');

        editor_model.current_post(this);

    }.bind(this);

    this.remove = function() {
      var current;
      $.post(sync_gateway, {
        'path': this.path,
        'is_deleted': true
      });
      editor_model.posts.remove(this);
      if (editor_model.posts().length) {
          current = editor_model.posts()[0];
          return current.edit();
      } else {
        return editor_model.create_post();
      }
    }.bind(this);

};


var editorModel = function() {
    var self = this;

    self.posts = ko.observableArray([]);
    self.current_post = ko.observable({});
    self.has_new_post = false;

    self.init_editor = function(){
        var title = get_today_str();
        var titles = $.map(self.posts(), function(post){return post.title});
        if ($.inArray(title, titles) == -1){
            self.create_post();
        }
        else{
            self.posts()[0].edit();
        }
    };

    self.create_post = function(){
        if (!self.has_new_post){ /*not allowed to create 2+ new posts before synced to server*/
            var i = 0;
            var titles = $.map(self.posts(), function(post){return post.title});
            while(i<10){
                var title = get_today_str();
                if (i) title = title + '-' + i; /*not first one*/
                if ($.inArray(title, titles) == -1){ /*not contain this title, valid */
                    break
                }
                else{
                    i += 1
                }
            }
            var new_post = new Post({path: title+'.txt', title: title});
            self.posts.unshift(new_post);
            new_post.edit(700);
            self.has_new_post = true;

        }
        else if(self.current_post()!=self.posts()[0]){ /*jump from other post*/
            self.posts()[0].edit();
        }
        else{ /*current is the new post, just hide*/
            hide_controls();
        }


    };


    self.sync = function(){
        var post_on_edit = self.current_post();


        $.post(
            sync_gateway,
            {
                path: post_on_edit.path,
                raw_content: to_markdown($('.todo-html').html())
            },
            function(raw_post, status){
                if (status  == 'success'){
                    $.extend(post_on_edit, new Post(raw_post));
                }
            }

        );
    };



 };


function run_editor(){
    editor_model = new editorModel();

    $(document).ready(function(){
        controls = $('#controls');

        hide_controls();

        load_data();
        ko.applyBindings(editor_model);
        controls.mouseenter(show_controls);
        controls.mouseleave(hide_controls);

    });


}
