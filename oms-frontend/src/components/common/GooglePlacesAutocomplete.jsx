import { useEffect, useRef, useState } from "react";

let googleMapsPromise;

const loadGoogleMaps = (apiKey) => {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (!apiKey) {
    return Promise.resolve(null);
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(
        'script[data-google-maps-places="true"]',
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.google));
        existingScript.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      const callbackName = "__googleMapsPlacesCallback";

      window[callbackName] = () => {
        resolve(window.google);
        delete window[callbackName];
      };

      script.async = true;
      script.defer = true;
      script.dataset.googleMapsPlaces = "true";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}&language=en&region=IN`;
      script.onerror = () => reject(new Error("Failed to load Google Maps"));

      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
};

const getAddressPart = (components, type) =>
  components.find((component) => component.types.includes(type));

const parsePlaceDetails = (place) => {
  const components = place?.address_components || [];
  const streetNumber = getAddressPart(components, "street_number")?.long_name;
  const route = getAddressPart(components, "route")?.long_name;
  const sublocality =
    getAddressPart(components, "sublocality_level_1")?.long_name ||
    getAddressPart(components, "sublocality")?.long_name;
  const locality =
    getAddressPart(components, "locality")?.long_name ||
    getAddressPart(components, "administrative_area_level_2")?.long_name ||
    sublocality;
  const state =
    getAddressPart(components, "administrative_area_level_1")?.long_name;
  const pincode = getAddressPart(components, "postal_code")?.long_name;

  const streetAddress = [streetNumber, route]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    address: place?.formatted_address || place?.name || streetAddress || "",
    city: locality || "",
    state: state || "",
    pincode: pincode || "",
  };
};

const GooglePlacesAutocomplete = ({
  register,
  setValue,
  addressFieldName = "address",
  cityFieldName = "city",
  stateFieldName = "state",
  pincodeFieldName = "pincode",
  label = "Street Address",
  placeholder = "Start typing your address",
  helperText = "Address suggestions are powered by Google Places and limited to India.",
  className = "",
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const addressRegistration = register(addressFieldName);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (!google?.maps?.places || !inputRef.current) {
          return;
        }

        autocompleteRef.current = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            componentRestrictions: { country: "in" },
            fields: ["address_components", "formatted_address", "name"],
            types: ["address"],
          },
        );

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace();
          const details = parsePlaceDetails(place);

          setValue(addressFieldName, details.address, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
          setValue(cityFieldName, details.city, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
          setValue(stateFieldName, details.state, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
          setValue(pincodeFieldName, details.pincode, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });

          if (inputRef.current) {
            inputRef.current.value = details.address;
          }
        });

        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(false);
      });
  }, [addressFieldName, cityFieldName, pincodeFieldName, setValue, stateFieldName]);

  return (
    <div className={className}>
      <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          {...addressRegistration}
          ref={(node) => {
            addressRegistration.ref(node);
            inputRef.current = node;
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl bg-surface-container-low border-none py-3.5 px-4 pr-10 text-sm text-on-surface focus:ring-1 focus:ring-primary transition-all"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-base">
          {isLoaded ? "travel_explore" : "location_on"}
        </span>
      </div>
      <p className="text-xs text-on-surface-variant mt-1.5">{helperText}</p>
    </div>
  );
};

export default GooglePlacesAutocomplete;