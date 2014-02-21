var sync_url = '/service/gateway/sync_3rd';
var on_processing = false;


var get_content = function(){
    var title = $.trim($('#title').val());
    var content = $.trim($('textarea').val());
    return 'Title: '+title+'\naccount_id: '+visitor_account_id+
        '\nauthor_name: ' + author_name + '\nemail_md5: '+email_md5+ '\n\n' + content;
};

var sync_post = function() {
    if (on_processing){
        return false
    }

    var info_dom = $('.ajax_info');
    var title = $.trim($('#title').val());
    var content = $.trim($('textarea').val());
    if (!title || !content){
        info_dom.text("title and content can't be blank");
        return false
    }
    var raw_content = get_content();

    on_processing = true;
    info_dom.text('working...');
    var data_to_post = {raw_content:raw_content, folder_3rd: $('select').val()};

    //编辑模式
    var path_dom = $('#path');
    if (path_dom){
        data_to_post['path'] = path_dom.val()
    }

    $.post(sync_url, data_to_post, function(response_data, status){
        if (status=='success'){
            if (response_data && response_data.error_code){
                info_dom.text(response_data.message);
                on_processing = false;
            }
            else{
                location.href = '/?'+Math.random();
            }
        }
    });

    return false
};


$(document).ready(function(){
   $('a.pure-button').click(sync_post);
});

