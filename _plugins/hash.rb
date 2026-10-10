require 'liquid'

module Jekyll
  module HashFilters
    # merge main hash with another hash of defaults
    def hash_default(hash, defaults)
      if not defaults.is_a?(Hash)
        return hash
      end
      defaults.each do |key, value|
        # substitute main string into default string and set main item
        if value.is_a?(String) and value.include?"$VALUE"
          # a full url (e.g. a whole LinkedIn profile link) is used as given
          if hash[key].is_a?(String) and not hash[key] =~ /\A(https?:|mailto:|tel:)/
            hash[key] = value.sub"$VALUE", hash[key]
          end
        # set main item to default item if not defined
        else
          if hash[key] == nil or !hash.key?(key)
            hash[key] = value
          end
        end
      end
      return hash
    end
  end
end

Liquid::Template.register_filter(Jekyll::HashFilters)
