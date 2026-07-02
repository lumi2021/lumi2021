def replace_block(readme, start_tag, end_tag, content):
    before = readme.split(start_tag)[0]
    after = readme.split(end_tag)[1]

    return before + start_tag + "\n" + content + "\n" + end_tag + after