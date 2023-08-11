ls -1 posts | awk -F-- '{ print "https://www.rubick.com/" $2 }'
