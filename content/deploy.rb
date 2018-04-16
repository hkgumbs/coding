#!/usr/bin/env ruby

require "json"
require "yaml"
require "fileutils"

def without_frontmatter(path)
  File.read(path).split("---")[2..-1].join.strip
end

content = File.dirname(__FILE__)
api = File.join File.dirname(content), "client", "public", "api"


# LESSONS

lessons = File.join api, "lessons"
FileUtils.mkdir_p lessons

YAML.load_file(File.join(content, "_data", "lessons.yaml")).each do |config|
  File.write File.join(lessons, config["location"]), JSON.generate(
    title: config["title"],
    items: config["items"].map do |item|
      markdown = File.join content, config["location"], "#{item}.md"
      YAML.load_file(markdown).tap do |data|
        data["content"] = without_frontmatter(markdown)
      end
    end
  )
end


# INFO

info = File.join(api, "info")
FileUtils.mkdir_p info

Dir.glob(File.join(content, "*.md")) do |path|
  File.write(
    File.join(info, File.basename(path, ".md")),
    without_frontmatter(path)
  )
end
