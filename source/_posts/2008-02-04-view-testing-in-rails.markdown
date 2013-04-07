---
layout: post
title: "View Testing in Rails"
date: 2008-02-04 14:42
author: Austin Putman
comments: true
published: false
categories: 
---
So I am working my way through my first Rails app.  I'm trying to start out on the right foot and practice [Behavior Driven Development](http://behaviour-driven.org/).  There are tons of great examples of what to do in the [model](http://jakescruggs.blogspot.com/2007/08/rspec-on-rails-models.html), and if you dig a little you can check out
[some](http://www.clarkware.com/cgi/blosxom/2007/09/08#TestingControllers) 
[controller](http://www.elevatedrails.com/articles/2007/09/10/testing-controllers-with-rspec/)
[specs](http://git.caboo.se/?p=altered_beast.git;a=blob;f=spec/controllers/forums_controller_spec.rb;h=6d93c71e6d95f2b0883f7d2e6994784babfe92fa;hb=HEAD).

There's a telling line in [Jake Scruggs' post on model specs](http://jakescruggs.blogspot.com/2007/08/rspec-on-rails-models.html).
After 2 rapid posts on [Rspec](http://rspec.info) and how to use it with models, he says "the next post will be about views".  As of this writing, that was almost 6 months ago.

View testing is not as easy as it could be in Rails.  In this article we're going to cover a number of the available tools, hopefully with some brief code samples for each.  I am _just_ learning each of these technologies, so if you can give me feedback or point me to better information, that would be great.  Also, a shout-out goes to Err the Blog for [this incredibly informative discussion on the topic.](http://errtheblog.com/posts/66-view-testing-20)

## Rspec

I'm using Rspec's have_tag matcher here, which is a wrapper for the assert_select that ships with Rails' Test::Unit.  
We render the template by calling `render 'contacts/new'`.  
Rather than specifying the object here, we're specifying the full route and leaving it to rails to work out the appropriate view calls.  
I'm also using `response.body.should match(/regex/)` to check for particular text I'm expecting.


    #this is spec/views/contacts_spec.rb
    require File.dirname(__FILE__) + '/../spec_helper.rb'

    describe 'Contacts views' do
      before do
        login_valid_user
      end

      describe 'new page' do

        before do
          @contact = Contact.create :name => \"John\"
          assigns[:contact] = @contact
        end

        def action!
          render 'contacts/new'
          response
        end

        it \"has a mailing address block\" do
          action!.should have_tag(\"#mailing_address\")
        end

        it \"should not have a model number\" do
          action!.body.should_not match(/model_id/)
        end

      end
    end


Rspec is able to check html as rendered by the system, but some tests require a series of coordinated user actions.

## Webrat: UI Storyboarding


To check whether a sequence of user actions has the intended effect, there's now [webrat](http://www.brynary.com/2007/12/8/webrat-0-1-0-released).  It combines libraries like Hpricot and WWW::Mechanize to provide a clear and concise DSL for running integration tests on your ruby app.

Webrat is Test::Unit based, but is getting strong support from Rspec maintainer David Chelimsky.  RubyConf 2008 will feature a demo of how to use Webrat with the new Story Runner in Rspec.  Until then, I've cobbled together a simple example of how to build webrat examples in Rspec:

    #this file is spec/integration/contacts_spec.rb
    require File.dirname(__FILE__) + '/../spec_helper.rb'
    describe 'Contacts processing with webrat' do

      describe 'create contact' do
        before(:all) do
          @webrat = ActionController::Integration::Session.new
          jackie = User.find_by_login(\"jackie\")
          unless jackie.has_role? \"admin\"
            Permission.create!(
               :user => jackie,
               :role => Role.find_or_create_by_rolename(\"admin\")
            )
          end
        end

        before(:each) do
          @webrat.reset!
          login_integration_user
        end


        it \"can log in\" do
          @webrat.reset!
          @webrat.visits \"/login\"
          @webrat.fills_in \"login\", :with => \"jackie\"
          @webrat.fills_in \"password\", :with => \"test\"
          @webrat.checks \"remember_me\"
          @webrat.clicks_button \"Log in\"
          @webrat.response.body.should match(/Logged in/)
        end

        it \"should show the contact when submitted\" do
          @webrat.visits \"/contacts/new\"
          @webrat.fills_in \"Name\", :with => \"John\"
          @webrat.fills_in \"Phone\", :with => \"555\"
          @webrat.clicks_button \"Create\"
          @webrat.response.body.should match(/John/)
        end


      end


      def login_integration_user
        @webrat.visits \"/login\"
        @webrat.fills_in \"login\", :with => \"jackie\"
        @webrat.fills_in \"password\", :with => \"test\"
        @webrat.clicks_button \"Log in\"
      end
    end



I had a tough time getting these examples to pass.  For newbie types, remember that your test database is totally at the mercy of your fixtures.  Fixture data *replaces* data that was written in during migrations.  I had to break out the mysql console to figure out why my admin user wasn't available.  The solution, as you can see above, was to assign an administrative role to one of the users from my fixtures before running the test sequence.

It is important to note that nearly every webrat command has an implicit assertion.  `#visit` will throw an error if the page is not found, `#fills_in` complains if the field isn't found, `#clicks_button` fails if the button can't be found.  In the above examples I have included an Rspec assertion at the end of each to back up the description of the behavior under test.

Webrat is great for smoke-testing.  Does the page render with the expected data?  Are your redirects behaving as expected?   It is also great for modeling your expected workflows for users who are not using javascript, as well as testing any accomodations you are making for users of text-based browsers and screen readers.
