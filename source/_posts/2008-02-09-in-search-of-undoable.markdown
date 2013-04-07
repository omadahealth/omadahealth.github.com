---
layout: post
title: "In Search of Undoable"
date: 2008-02-09 17:42
author: Austin Putman
comments: true
published: false
categories: 
---

I hate it when my computer asks me if I am "sure".  Install a Firefox add-on?  Send a file to the Trash?  Connect to the network?  *Are you sure?*

Some of these actions could cause lasting damage, and perhaps deserve special consideration. A Firefox add-on has full access to your machine and could do nasty, irreversible things, like committing credit card fraud from your own IP.  For this reason Firefox requires a mousing pole-vault: Click the provided "Edit Settings" button, click Allow in the new popup, close the pop-up, click install again.  Even when you've previously granted permission for this site, FF still makes you wait 3 _interminable_ seconds before allowing you to go ahead and click the Install button.  A little cooling-off period.

Why?  Computer users reflexively click confirmation boxes.  If you've been working with computers since grade school, a confirmation box is like those [toddler gates](http://flickr.com/photos/schwarz/22252378/) -- something to slow down the immature and the ignorant.  Once you are familiar with the gate, you just vault over it and don't break stride.  Those who have never encountered the obstacle before read every word in the confirmation box and, more often than not, are still unsure what the right answer is.

Neither of these outcomes are desirable.  The solution is, wherever possible, to eliminate confirmation popups.  "But then the user might do something bad!"  It's true.  In fact, the user *will* do something bad, or at least something unintended.  Good code allows them to recover.  Confirmation boxes do not.

None of this is my idea.  This is all straight from the [About Face playbook](http://www.abebooks.com/servlet/BookDetailsPL?bi=894571748).  One of their major recommendations ( or tenets of faith ) is that multiple Undo should always be provided to the user.

So it surprises me that there's not an obvious undo pattern floating around the Rails blogosphere.  What does exist is the [undo_helper plugin](http://agilewebdevelopment.com/plugins/undo_helper). This could be combined with some other plugins ( check out [acts_as_versioned](http://agilewebdevelopment.com/plugins/acts_as_versioned), [simply_versioned](http://agilewebdevelopment.com/plugins/simplyversioned), and [acts_as_paranoid](http://agilewebdevelopment.com/plugins/acts_as_paranoid) ), to form the rudiments of an undo system.

So far full versioning seems like overkill, and acts_as_paranoid hasn't been updated to be compatible with Rails 1.2, much less 2.0.2.  So I'm on my own taking the undo helper and adding in some custom code.

First, we need something to deal with deletion.  I put together this little is_undeletable plugin.  I opted to leave the destroy method as-is and create a #delete method that marks the model as deleted in the database.  Also this depends on the has_finder gem to create a selector.  So the idea is, whenever you doing a find for display purposes, you have to call `Contact.visible.find`.
``` ruby
    class ActiveRecord::Base
      def self.is_undeletable
        if self.column_names.include? 'deleted_at'
          include Undeletable
        else
          raise ArgumentError, "#{self.name} requires a deleted_at column to be undeletable"
        end
      end
    end
    module Undeletable
      def self.included(target)
        target.has_finder :visible, :conditions => [ 'isnull(deleted_at)' ]
        target.attr_protected :deleted_at
      end

      def delete
        return if self.deleted?
        self.class.record_timestamps = false
        self.update_attribute(:deleted_at, Time.now)
        self.class.record_timestamps = true
      end

      def restore
        self.class.record_timestamps = false
        self.update_attribute(:deleted_at, nil)
        self.class.record_timestamps = true
      end

      def deleted?
        !self.deleted_at.nil?
      end

    end
```

Now we can enable models to be undeleteable with the following code:
``` ruby
    class OrangeWhip << ActiveRecord::Base
      is_undeletable
    end
```
and your controllers will need a new restore method:
``` ruby
      # PUT /orange_whips/1/restore
      def restore
        @orange_whip = OrangeWhip.find(params[:id])
        @orange_whip.restore
        unless params[:undo]
          undo.push( "Delete Frosty Beverage Order #{@orange_whip.order_qty}",
             :action => 'destroy',
             :id => @orange_whip.id,
             :method => 'delete' )
        end

        respond_to do |format|
          format.html { redirect_to(orange_whip_url(@orange_whip)) }
          format.xml  { head :ok }
          format.json { head :ok }
        end
      end
```
In case you are following along at home, here's a section of the integration spec I wrote for undoing restoration:
``` ruby
    it "should undo restoration" do
      post :create, :orange_whip => { :order_qty => "3" }
      @orange_whip = assigns[:orange_whip]
      delete :destroy, :id => @orange_whip.id
      put :restore, :id => @orange_whip.id
      undo!
      lambda { get :show, :id => @orange_whip.id }.should raise_error
    end
    def undo!
      controller.undo.render do | undo, options |
        send undo[:url][:method], undo[:url][:action].to_sym, undo[:url]
      end
    end
```

One behavior I discoverd in undo_helper is that it only accepts one level of Hashing in its arguments.  All values get .to_s called on them, which turns hashes into an unpredictable mess.  I was hoping to avoid dealing with versioning by saving object state to the undo stack, like so:
``` ruby
    def update
        @orange_whip = OrangeWhip.visible.find(params[:id])
        unless params[:undo]
          undo.push( "Reverse changes to orange_whip #{@orange_whip.name}",
             :action => 'update',
             :id => @orange_whip.id,
             :method => 'put',
             :orange_whip => @orange_whip.attributes  )
        end
        ...etc....
    end
```
Trying this with my specced *undo!* method i get back this error: `undefined method ``stringify_keys!' for <String....` .  For now I'm working around that by setting the value of :orange_whip to JSON notation, then setting my spec to decode it before posting it back to the controller:
``` ruby
    def update
      ...etc....
        undo.push( "Reverse changes to Beverage Order #{@orange_whip.order_qty}",
               :action => 'update',
               :id => @orange_whip.id,
               :method => 'put',
               :orange_whip => @orange_whip.attributes.to_json )
      ...etc....
    end

    ## and in the spec....
    def undo!
      controller.undo.render do | undo, options |
        model_name = controller.controller_name.singularize.to_sym
        undo_params = undo[:url].dup
        undo_params.delete :action

        if undo_params.has_key? model_name
          undo_params[model_name] = ActiveSupport::JSON.decode(undo_params[model_name])
        end
        send undo[:url][:method], undo[:url][:action].to_sym, undo_params
      end
    end
```
I did try writing my own encoding for the url parameters, but it introduced a lot of lines that were unneccessary.  It seems amazing to me that Rails doesn't have a Hash.to_params method built-in that would handle this.  I may be taking the very wrong approach to the whole problem.  Thoughts?
