module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")

    coffee:
      compile:
        files:
          'js/scripts.js': 'coffee/scripts.coffee'

    compass:
      dist:
        options:
          importPath: ["bower_components/foundation/scss"]

    watch:
      grunt:
        files: ["Gruntfile.js"]

      compass:
        files: "scss/*"
        tasks: ["compass"]

      coffee: 
        files: "coffee/**/*.coffee"
        tasks: ["coffee"]

  grunt.loadNpmTasks "grunt-contrib-watch"
  grunt.loadNpmTasks "grunt-contrib-coffee"
  grunt.loadNpmTasks "grunt-contrib-compass"

  grunt.registerTask "build", ["compass", "coffee"]
  grunt.registerTask "default", [
    "build"
    "watch"
  ]
  return
